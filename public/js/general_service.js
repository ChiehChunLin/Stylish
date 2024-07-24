function checkStatus(res) {
  if (res.ok) {
    return Promise.resolve(res);
  } else {
    switch (res.status) {
      case 400:
      case 403:
        return Promise.resolve(res);

      default:
        return Promise.reject(new Error(res.statusText));
    }
  }
}
function checkResponse(res) {
  if (res.redirected) {
    location.href = res.url;
    return;
  } else {
    return res.json();
  }
}
function displayTempMessage(message) {
  if (message) {
    $(`<h2 class="message">${message}</h2>`)
      .insertBefore("div.main-container")
      .hide()
      .slideDown(1000)
      .delay(3000)
      .slideUp(500);
  }
}
function displayTargetTempMessage(target, message) {
  if (message) {
    $(`<h2 class="message">${message}</h2>`).insertBefore(target);
  }
}
