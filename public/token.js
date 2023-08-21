if (!getCookie("token")) {
    const request = new XMLHttpRequest();
    request.open("GET", "/start-session", false);
    request.onreadystatechange = () => {
        if (request.readyState == XMLHttpRequest.DONE) {
            console.log(request.responseText);
            setCookie("token", request.responseText, 1);
        }
    }
    request.send();
};

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires;
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}