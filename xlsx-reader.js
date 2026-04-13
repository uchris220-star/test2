(function attachMaiWorkbookParser(global) {
  const textDecoder = new TextDecoder("utf-8");
  const DATE_STYLE_IDS = new Set([
    14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50,
    51, 52, 53, 54, 55, 56, 57, 58,
  ]);

  function assertBrowserSupport() {
    if (typeof DOMParser === "undefined" || typeof DecompressionStream === "undefined") {
      throw new Error("Direct XLSX upload needs a modern Chromium-based browser. Use CSV if Excel import is unavailable.");
    }
  }

  function readUInt16(view, offset) {
    return view.getUint16(offset, true);
  }

  function readUInt32(view, offset) {
    return view.getUint32(offset, true);
  }

  function normalizeZipPath(path) {
    return String(path || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
  }

  function dirname(path) {
    const normalizedPath = normalizeZipPath(path);
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    return lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex + 1);
  }

  function resolveZipPath(basePath, targetPath) {
    const normalizedTarget = normalizeZipPath(targetPath);

    if (!normalizedTarget) {
      return "";
    }

    if (!normalizedTarget.startsWith(".")) {
      if (normalizedTarget.startsWith("xl/") || normalizedTarget.startsWith("_rels/")) {
        return normalizedTarget;
      }

      return normalizeZipPath(`${dirname(basePath)}${normalizedTarget}`);
    }

    const baseParts = dirname(basePath)
      .split("/")
      .filter(Boolean);
    const targetParts = normalizedTarget.split("/");

    targetParts.forEach((part) => {
      if (!part || part === ".") {
        return;
      }

      if (part === "..") {
        baseParts.pop();
        return;
      }

      baseParts.push(part);
    });

    return baseParts.join("/");
  }

  function parseXml(xmlText) {
    const parsedDocument = new DOMParser().parseFromString(xmlText, "application/xml");
    const parserErrors = parsedDocument.getElementsByTagName("parsererror");

    if (parserErrors.length > 0) {
      throw new Error("The Excel workbook could not be read.");
    }

    return parsedDocument;
  }

  function getElements(node, localName) {
    return Array.from(node.getElementsByTagNameNS("*", localName));
  }

  function getChildElements(node, localName) {
    return Array.from(node.childNodes).filter(
      (childNode) => childNode.nodeType === 1 && childNode.localName === localName
    );
  }

  function getNodeText(node) {
    return node ? node.textContent || "" : "";
  }

  function getFirstNode(node, localName) {
    return getElements(node, localName)[0] || null;
  }

  function getRelsPath(filePath) {
    const normalizedPath = normalizeZipPath(filePath);
    const directoryPath = dirname(normalizedPath);
    const fileName = normalizedPath.slice(directoryPath.length);
    return `${directoryPath}_rels/${fileName}.rels`;
  }

  async function inflateRaw(bufferSlice) {
    const stream = new Blob([bufferSlice]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer();
  }

  function createZipArchive(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const byteLength = arrayBuffer.byteLength;
    const endSearchOffset = Math.max(0, byteLength - 65557);
    let endOfCentralDirectoryOffset = -1;

    for (let offset = byteLength - 22; offset >= endSearchOffset; offset -= 1) {
      if (readUInt32(view, offset) === 0x06054b50) {
        endOfCentralDirectoryOffset = offset;
        break;
      }
    }

    if (endOfCentralDirectoryOffset === -1) {
      throw new Error("That Excel workbook looks invalid.");
    }

    const totalEntries = readUInt16(view, endOfCentralDirectoryOffset + 10);
    const centralDirectoryOffset = readUInt32(view, endOfCentralDirectoryOffset + 16);
    let cursor = centralDirectoryOffset;
    const entries = new Map();

    for (let index = 0; index < totalEntries; index += 1) {
      if (readUInt32(view, cursor) !== 0x02014b50) {
        throw new Error("The workbook archive could not be read.");
      }

      const compressionMethod = readUInt16(view, cursor + 10);
      const compressedSize = readUInt32(view, cursor + 20);
      const uncompressedSize = readUInt32(view, cursor + 24);
      const fileNameLength = readUInt16(view, cursor + 28);
      const extraLength = readUInt16(view, cursor + 30);
      const commentLength = readUInt16(view, cursor + 32);
      const localHeaderOffset = readUInt32(view, cursor + 42);
      const fileNameBytes = new Uint8Array(arrayBuffer, cursor + 46, fileNameLength);
      const fileName = normalizeZipPath(textDecoder.decode(fileNameBytes));

      entries.set(fileName, {
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      });

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }

    async function getEntryBuffer(path) {
      const normalizedPath = normalizeZipPath(path);
      const entry = entries.get(normalizedPath);

      if (!entry) {
        return null;
      }

      const headerOffset = entry.localHeaderOffset;

      if (readUInt32(view, headerOffset) !== 0x04034b50) {
        throw new Error(`The workbook entry ${normalizedPath} is corrupted.`);
      }

      const fileNameLength = readUInt16(view, headerOffset + 26);
      const extraLength = readUInt16(view, headerOffset + 28);
      const dataOffset = headerOffset + 30 + fileNameLength + extraLength;
      const compressedBuffer = arrayBuffer.slice(dataOffset, dataOffset + entry.compressedSize);

      if (entry.compressionMethod === 0) {
        return compressedBuffer;
      }

      if (entry.compressionMethod === 8) {
        return inflateRaw(compressedBuffer);
      }

      throw new Error("This Excel file uses a compression method that is not supported in the browser parser.");
    }

    return {
      has(path) {
        return entries.has(normalizeZipPath(path));
      },
      async getText(path) {
        const buffer = await getEntryBuffer(path);
        return buffer ? textDecoder.decode(buffer) : "";
      },
    };
  }

  function parseRootRelationships(xmlText) {
    const relationshipsDocument = parseXml(xmlText);
    const relationshipNode = getElements(relationshipsDocument, "Relationship").find(
      (node) => node.getAttribute("Type") === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    );

    if (!relationshipNode) {
      throw new Error("The workbook relationship file is missing.");
    }

    return relationshipNode.getAttribute("Target") || "";
  }

  function parseWorkbookMeta(workbookXml, workbookRelsXml, workbookPath) {
    const workbookDocument = parseXml(workbookXml);
    const workbookRelsDocument = parseXml(workbookRelsXml);
    const relationshipMap = new Map(
      getElements(workbookRelsDocument, "Relationship").map((node) => [
        node.getAttribute("Id"),
        resolveZipPath(workbookPath, node.getAttribute("Target") || ""),
      ])
    );
    const firstSheetNode = getElements(workbookDocument, "sheet")[0];

    if (!firstSheetNode) {
      throw new Error("The workbook does not contain any worksheets.");
    }

    const relationshipId = firstSheetNode.getAttributeNS(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "id"
    ) || firstSheetNode.getAttribute("r:id");
    const worksheetPath = relationshipMap.get(relationshipId);

    if (!worksheetPath) {
      throw new Error("The first worksheet could not be loaded from the workbook.");
    }

    return {
      sheetName: firstSheetNode.getAttribute("name") || "Sheet 1",
      worksheetPath,
    };
  }

  function parseSharedStrings(sharedStringsXml) {
    const sharedStringsDocument = parseXml(sharedStringsXml);
    return getElements(sharedStringsDocument, "si").map((stringNode) =>
      getElements(stringNode, "t")
        .map((textNode) => getNodeText(textNode))
        .join("")
    );
  }

  function isDateFormat(numFmtId, formatCode) {
    if (DATE_STYLE_IDS.has(numFmtId)) {
      return true;
    }

    const normalizedFormatCode = String(formatCode || "")
      .replace(/\[[^\]]*]/g, "")
      .replace(/"[^"]*"/g, "")
      .replace(/\\./g, "")
      .toLowerCase();

    return /(?:y|m|d|h|s|am\/pm)/.test(normalizedFormatCode);
  }

  function parseStyles(stylesXml) {
    const stylesDocument = parseXml(stylesXml);
    const customFormats = new Map(
      getElements(stylesDocument, "numFmt").map((node) => [
        Number(node.getAttribute("numFmtId")),
        node.getAttribute("formatCode") || "",
      ])
    );
    const dateStyleIndexes = new Set();
    const cellXfsNode = getFirstNode(stylesDocument, "cellXfs");

    if (!cellXfsNode) {
      return { dateStyleIndexes };
    }

    getChildElements(cellXfsNode, "xf").forEach((xfNode, index) => {
      const numFmtId = Number(xfNode.getAttribute("numFmtId") || 0);
      const formatCode = customFormats.get(numFmtId) || "";

      if (isDateFormat(numFmtId, formatCode)) {
        dateStyleIndexes.add(index);
      }
    });

    return { dateStyleIndexes };
  }

  function columnLabelToIndex(cellReference) {
    const letters = String(cellReference || "")
      .replace(/[0-9]/g, "")
      .toUpperCase();
    let columnIndex = 0;

    for (let index = 0; index < letters.length; index += 1) {
      columnIndex = columnIndex * 26 + (letters.charCodeAt(index) - 64);
    }

    return Math.max(0, columnIndex - 1);
  }

  function excelSerialToIsoText(serialValue) {
    const numericValue = Number(serialValue);

    if (!Number.isFinite(numericValue)) {
      return String(serialValue || "");
    }

    const wholeDays = Math.floor(numericValue);
    const fractionalDay = numericValue - wholeDays;
    const epoch = Date.UTC(1899, 11, 30);
    const dateValue = new Date(epoch + wholeDays * 86400000 + Math.round(fractionalDay * 86400000));
    const year = dateValue.getUTCFullYear();
    const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getUTCDate()).padStart(2, "0");
    const hours = String(dateValue.getUTCHours()).padStart(2, "0");
    const minutes = String(dateValue.getUTCMinutes()).padStart(2, "0");
    const seconds = String(dateValue.getUTCSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+12:00`;
  }

  function parseCellValue(cellNode, sharedStrings, styles) {
    const cellType = cellNode.getAttribute("t") || "";
    const styleIndex = Number(cellNode.getAttribute("s") || -1);
    const valueNode = getFirstNode(cellNode, "v");

    if (cellType === "inlineStr") {
      return getElements(cellNode, "t")
        .map((textNode) => getNodeText(textNode))
        .join("");
    }

    if (cellType === "s") {
      return sharedStrings[Number(getNodeText(valueNode))] || "";
    }

    if (cellType === "b") {
      return getNodeText(valueNode) === "1" ? "TRUE" : "FALSE";
    }

    if (cellType === "str") {
      return getNodeText(valueNode);
    }

    const rawValue = getNodeText(valueNode);

    if (styles.dateStyleIndexes.has(styleIndex)) {
      return excelSerialToIsoText(rawValue);
    }

    return rawValue;
  }

  function parseWorksheetRows(worksheetXml, sharedStrings, styles) {
    const worksheetDocument = parseXml(worksheetXml);
    const rowNodes = getElements(worksheetDocument, "row");

    return rowNodes.map((rowNode) => {
      const values = [];

      getChildElements(rowNode, "c").forEach((cellNode) => {
        const cellReference = cellNode.getAttribute("r") || "";
        const columnIndex = columnLabelToIndex(cellReference);
        values[columnIndex] = parseCellValue(cellNode, sharedStrings, styles);
      });

      return values.map((value) => (value == null ? "" : String(value).trim()));
    });
  }

  async function parseWorkbook(arrayBuffer) {
    assertBrowserSupport();

    const zipArchive = createZipArchive(arrayBuffer);
    const rootRelationshipsXml = await zipArchive.getText("_rels/.rels");

    if (!rootRelationshipsXml) {
      throw new Error("The workbook relationships file could not be found.");
    }

    const workbookPath = resolveZipPath("_rels/.rels", parseRootRelationships(rootRelationshipsXml));
    const workbookXml = await zipArchive.getText(workbookPath);
    const workbookRelsXml = await zipArchive.getText(getRelsPath(workbookPath));

    if (!workbookXml || !workbookRelsXml) {
      throw new Error("The workbook contents could not be read.");
    }

    const workbookMeta = parseWorkbookMeta(workbookXml, workbookRelsXml, workbookPath);
    const worksheetXml = await zipArchive.getText(workbookMeta.worksheetPath);

    if (!worksheetXml) {
      throw new Error("The first worksheet could not be opened.");
    }

    const sharedStrings = zipArchive.has("xl/sharedStrings.xml")
      ? parseSharedStrings(await zipArchive.getText("xl/sharedStrings.xml"))
      : [];
    const styles = zipArchive.has("xl/styles.xml")
      ? parseStyles(await zipArchive.getText("xl/styles.xml"))
      : { dateStyleIndexes: new Set() };
    const rows = parseWorksheetRows(worksheetXml, sharedStrings, styles);

    if (rows.length < 2) {
      throw new Error("The first worksheet is empty. Add a header row and at least one schedule row.");
    }

    return {
      sheetName: workbookMeta.sheetName,
      allRows: rows,
      headers: rows[0],
      rows: rows.slice(1),
    };
  }

  global.maiWorkbookParser = {
    parseWorkbook,
  };
})(window);
