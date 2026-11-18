# InDesign ExtendScript (ECMAScript 3) Constraints & Production Gotchas

When developing automated publishing scripts for Adobe InDesign CC via ExtendScript:

---

## 1. ECMAScript 3 (1999) Environment Limitations

ExtendScript runs an engine locked to ECMAScript 3:
- **No Native `JSON` Object:** `JSON.parse` and `JSON.stringify` do not exist natively. You must include a lightweight JSON polyfill or use Python to preprocess data into simple structures.
- **No Modern Array Methods:** `Array.prototype.forEach`, `map`, `filter`, `includes`, and `indexOf` are unavailable without polyfills. Use traditional `for (var i = 0; i < len; i++)` indexing.
- **No Modern String Methods:** `String.prototype.trim`, `startsWith`, and `endsWith` are absent. Always define:
  ```javascript
  if (!String.prototype.trim) {
      String.prototype.trim = function () {
          return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
      };
  }
  ```
- **No `let` or `const`:** Only `var` exists. Variable declarations are hoisted to the top of function scope.
- **ECMAScript Regex Limitations:** Lookbehinds (`(?<=...)`) and Unicode property escapes (`\p{...}`) will cause syntax errors.

---

## 2. Asynchronous Background PDF Export (`app.backgroundTasks`)

In modern InDesign (CC 2020+), PDF exports execute asynchronously in a background worker thread (`app.backgroundTasks`):
- **The Failure Mode:** If a script calls `doc.close(SaveOptions.NO)` immediately after `doc.exportFile(ExportFormat.PDF_TYPE, ...)`, InDesign terminates the export thread prematurely, leaving a **0-byte or corrupted PDF file**.
- **The Mandatory Polling Loop:**
  ```javascript
  doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);

  var waitLoops = 0;
  while (app.backgroundTasks.length > 0 && waitLoops < 120) {
      $.sleep(500);
      waitLoops++;
  }
  ```

---

## 3. AppleScript Timeout Shield (600 Seconds)

The default AppleScript execution timeout is 120 seconds. Batch operations on 20+ documents often take 2 to 4 minutes.
- **Always wrap AppleScript invocations with a timeout shield:**
  ```applescript
  with timeout of 600 seconds
      tell application id "com.adobe.InDesign"
          do script (POSIX file "/path/to/script.jsx") language javascript
      end tell
  end timeout
  ```

---

## 4. Periodic Heap Memory Garbage Collection (`$.gc()`)

InDesign's internal JavaScript engine does not aggressively reclaim memory allocated for closed document objects during continuous loops.
- When iterating through 20+ documents, invoke ExtendScript's garbage collector every 5 documents:
  ```javascript
  if (docIndex % 5 === 0) {
      $.gc();
  }
  ```

---

## 5. Lock-File Collisions (`~*.idlk`)

When an InDesign document is open in the application, InDesign creates a hidden lock file (`~filename.idlk`):
- File system iterators will attempt to open these lock files if filtering is omitted, resulting in fatal runtime exceptions.
- Always filter out files whose names begin with `~` or end with `.idlk`.
