function mapLickToPlaybackEvents(lick) {
  let time = 0;
  return lick.notes.map((n) => {
    const evt = {
      note: n.note,
      duration: n.duration,
      time,
      midi: n.midi
    };
    time += n.duration;
    return evt;
  });
}

module.exports = { mapLickToPlaybackEvents };
