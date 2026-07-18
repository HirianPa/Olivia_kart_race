export class RaceManager {
  constructor(participants, { laps = 3, countdown = 3 } = {}) {
    this.participants = participants;
    this.totalLaps = laps;
    this.countdownRemaining = countdown;
    this.state = countdown > 0 ? 'countdown' : 'racing';
    this.time = 0;
    this.states = new Map(participants.map((participant) => [participant, {
      completedLaps: 0,
      previousProgress: participant.progress,
      finishTime: null,
    }]));
    this.player = participants[0];
  }

  get raceActive() { return this.state === 'racing'; }

  update(dt) {
    if (this.state === 'countdown') {
      this.countdownRemaining -= dt;
      if (this.countdownRemaining <= 0) {
        this.countdownRemaining = 0;
        this.state = 'racing';
      }
      return;
    }
    if (this.state !== 'racing') return;
    this.time += dt;
    for (const participant of this.participants) {
      const racerState = this.states.get(participant);
      const progress = participant.progress;
      if (racerState.previousProgress > 0.82 && progress < 0.18) {
        racerState.completedLaps += 1;
        if (racerState.completedLaps >= this.totalLaps && racerState.finishTime === null) racerState.finishTime = this.time;
      }
      racerState.previousProgress = progress;
    }
    if (this.states.get(this.player).completedLaps >= this.totalLaps) this.state = 'finished';
  }

  #ranking() {
    return [...this.participants].sort((a, b) => {
      const aState = this.states.get(a);
      const bState = this.states.get(b);
      if (aState.finishTime !== null || bState.finishTime !== null) {
        if (aState.finishTime === null) return 1;
        if (bState.finishTime === null) return -1;
        return aState.finishTime - bState.finishTime;
      }
      return (bState.completedLaps + b.progress) - (aState.completedLaps + a.progress);
    });
  }

  snapshot(participant = this.player) {
    const racerState = this.states.get(participant);
    const ranking = this.#ranking();
    return {
      state: this.state,
      countdown: Math.ceil(this.countdownRemaining),
      completedLaps: racerState.completedLaps,
      lap: Math.min(racerState.completedLaps + 1, this.totalLaps),
      totalLaps: this.totalLaps,
      position: ranking.indexOf(participant) + 1,
      total: this.participants.length,
      time: this.time,
      results: ranking.map((racer, index) => ({
        position: index + 1,
        name: racer.name,
        time: this.states.get(racer).finishTime,
      })),
    };
  }
}
