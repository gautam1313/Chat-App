const socket = io();

const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $messages = document.querySelector("#messages");
const $sendLocation = document.querySelector("#send-location");
const $sidebar = document.querySelector("#sidebar");

const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

const urlSearchParams = new URLSearchParams(window.location.search);
const { username, room } = Object.fromEntries(urlSearchParams.entries());
// const { username, room } = qs.parse(location.search);

const autoScroll = () => {
  const $newMessage = $messages.lastElementChild;

  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin; //New message complete height

  const visibleHeight = $messages.offsetHeight; //Visible height
  const containerHeight = $messages.scrollHeight; //Complete height of the messages (including the ones going out of screen)

  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (msg) => {
  console.log(msg);
  const html = Mustache.render(messageTemplate, {
    username: msg.username,
    message: msg.text,
    createdAt: moment(msg.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("locationMessage", (msgLoc) => {
  console.log(msgLoc);
  const htmlLoc = Mustache.render(locationTemplate, {
    username: msgLoc.username,
    location: msgLoc.url,
    createdLocationAt: moment(msgLoc.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", htmlLoc);
  autoScroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  $sidebar.innerHTML = html;
});

// socket.on("countUpdate", (count) => {
//   console.log("Count is updated ", count);
// });

// document.querySelector("#increment").addEventListener("click", () => {
//   console.log("Clicked");
//   socket.emit("increment");
// });

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // console.log("sent");
  // const input = document.querySelector("input").value;

  $messageFormButton.setAttribute("disabled", "disabled");

  const input = e.target.elements.message.value;
  socket.emit("sendMessage", input, (ack) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    console.log(ack);
  });
});

$sendLocation.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Invalid location");
  }
  $sendLocation.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const lat = coords.latitude;
    const lon = coords.longitude;
    socket.emit("shareLocation", { lat, lon }, () => {
      $sendLocation.removeAttribute("disabled");
      console.log("Location shared!");
    });
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
