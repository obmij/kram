function createAuthorizedBooking(form) {
  requireAuthorizedUser_();
  return createBooking(form);
}

function getAuthorizedAvailableSlots(coachName, courseDate) {
  requireAuthorizedUser_();
  return listAvailableSlots(coachName, courseDate);
}
