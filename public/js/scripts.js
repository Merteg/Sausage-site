function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}
function setCookie(name, value, options) {
    options = options || {};

    var expires = options.expires;

    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }

    value = encodeURIComponent(value);

    var updatedCookie = name + "=" + value;

    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
}
function deleteCookie(name) {
    setCookie(name, "", {
        expires: -1
    })
}
function logout(){
    deleteCookie("login");
    deleteCookie("rights");
    window.location.href = "/login";
}
function addToCart(id_product, count){
    count = +count;
    if(getCookie("product" + id_product)){
        let a = +getCookie("product" + id_product);
        count = +count +a;
    } 
    setCookie("product" + id_product, count, {path: "/"});
}

function checkOrder(){
    if(getCookie("login")) return true;
    else {
        alert("Ви повинні увійти як користувач!");
        return false;
    }
}