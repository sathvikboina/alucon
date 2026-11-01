// Serialises async work for the same key inside one Node process.
//
// The mentorship capacity and duplicate checks are read-then-write. A unique
// partial index closes the duplicate window across processes, but capacity is
// a count, so two simultaneous accepts could still both observe a free slot.
// Keying the critical section by mentor id makes the check-and-save atomic for
// the single-process deployment used here. A multi-instance deployment should
// replace this with a transaction or a slot document.
const tails = new Map();

function withLock(key, task) {
	const previous = tails.get(key) || Promise.resolve();
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const tail = previous.then(() => gate);
	tails.set(key, tail);

	return previous
		.then(task)
		.finally(() => {
			release();
			if (tails.get(key) === tail) tails.delete(key);
		});
}

module.exports = { withLock };
