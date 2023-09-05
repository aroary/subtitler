const view = document.getElementById("console");

function status(message) {
    view.innerHTML += message + "<br>";
}

function toggle() {
    view.style.display = ["none", "block"][~~(view.style.display === "none")];
}

// window.onload = () => view.style.display = "none";