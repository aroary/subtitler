const view = document.getElementById("console");

function status(message) {
    view.innerHTML += message + "<br>";
}

window.onload = () => view.style.display = "none";