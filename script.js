let filesToProcess = [];

// ドラッグ&ドロップエリア
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
});

function handleFiles(fileList) {
  filesToProcess = Array.from(fileList).filter(file => file.type.startsWith("image/"));
  showPreviews();
}

function showPreviews() {
  previewContainer.innerHTML = "";
  filesToProcess.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "preview";
      div.innerHTML = `<img src="${e.target.result}"><div>${file.name}</div>`;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// 変換＆ダウンロード
document.getElementById("startBtn").addEventListener("click", () => {
  if (!filesToProcess.length) return;

  const targetWidth = parseInt(document.getElementById("widthInput").value);
  const targetHeight = parseInt(document.getElementById("heightInput").value);
  const keepRatio = document.getElementById("keepRatio").checked;
  const format = document.getElementById("formatSelect").value;
  const quality = parseFloat(document.getElementById("qualityInput").value);

  const processPromises = filesToProcess.map(file => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let width = targetWidth;
        let height = targetHeight;

        if (keepRatio) {
          const aspect = img.width / img.height;
          if (targetWidth / targetHeight > aspect) {
            width = targetHeight * aspect;
          } else {
            height = targetWidth / aspect;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // 圧縮＆メタデータ削除
        canvas.toBlob(blob => {
          resolve({ blob, name: file.name.replace(/\.\w+$/, '') });
        }, format, quality);
      };
      img.src = URL.createObjectURL(file);
    });
  });

  Promise.all(processPromises).then(results => {
    if (results.length === 1) {
      // 1枚は直接ダウンロード
      const single = results[0];
      const url = URL.createObjectURL(single.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${single.name}.${format.split("/")[1]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // 複数はZIPにまとめてダウンロード
      const zip = new JSZip();
      results.forEach(file => {
        zip.file(`${file.name}.${format.split("/")[1]}`, file.blob);
      });
      zip.generateAsync({ type: "blob" }).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "images.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  });
});

// ファイル選択ボタン
document.getElementById("selectBtn").addEventListener("click", () => {
  fileInput.click();
});