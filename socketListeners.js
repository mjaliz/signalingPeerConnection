socket.on("availableOffers", (offers) => {
  console.log("available offers", offers);
});

socket.on("newOfferAwaiting", (offers) => {
  createOfferEls(offers);
});

function createOfferEls(offers) {
  const asnwerEl = document.querySelector("#answer");
  offers.forEach((o) => {
    const newOfferEl = document.createElement("div");
    newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
    newOfferEl.addEventListener("click", () => answerOffer(o));
    asnwerEl.appendChild(newOfferEl);
  });
}
