const urlContainer = document.getElementById("input-url-container");
const urlButton = document.getElementById("url-upload");

// drop uploading 
let dropArea = document.querySelector('.drop-area');
let imgView = document.querySelector('.imgView');
let inputText = document.querySelector('.input-text');

let statusElements = [form, loadingContainer];

form.addEventListener("submit", () => {
    statusElements.forEach(element => {
        element.dataset.status = 'loading';
    });
});

inputUrl.addEventListener('input', (e) => {
    changeButtonStatus();
    inputVideo.value = null;
    inputText.textContent = "Drop file or click to select file";
    uploadedImg.src = null;
    uploadedImg.classList.remove('show');
    preUploadedImg.classList.remove('hide');
    urlContainer.classList.remove("hide");
    inputText.classList.remove('video-selected');
    dropArea.classList.remove('droped');
    urlContainer.style.display = "block";
});

function changeButtonStatus() {
    if (dropArea.classList.contains('droped') || inputUrl.value !== '') {
        submitBtn.classList.add('working');
    } else {
        submitBtn.classList.remove('working');
    }
}

inputVideo.addEventListener('change', (event) => {
    if (event.target.files.length) fileAdded(event.target.files[0]);
});

function fileAdded(file) {
    let blobURL = URL.createObjectURL(file);
    uploadedImg.src = blobURL;
    uploadedImg.classList.add('show');
    preUploadedImg.classList.add('hide');
    inputText.classList.add('video-selected');
    inputText.textContent = inputVideo.files[0].name;
    dropArea.classList.add('droped');
    urlContainer.style.display = "none";
    inputUrl.value = '';
    changeButtonStatus();
}


dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
});

dropArea.addEventListener('dragleave', e => dropArea.classList.remove('drag-over'));

dropArea.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files[0].type.startsWith('video/mp4')) inputVideo.files = e.dataTransfer.files;
    else {
        dropArea.classList.remove('drag-over');
        alert('Video must be mp4 format');
        return;
    }
    fileAdded(e.dataTransfer.files[0]);
});