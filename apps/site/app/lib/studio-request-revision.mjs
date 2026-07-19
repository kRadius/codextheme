export function createStudioRequestGate() {
  let revision = 0;
  return Object.freeze({
    begin() {
      revision += 1;
      return revision;
    },
    invalidate() {
      revision += 1;
    },
    isCurrent(candidate) {
      return candidate === revision;
    },
  });
}

export function createStudioAsyncCoordinator() {
  const createGate = createStudioRequestGate();
  const imageGate = createStudioRequestGate();
  function finishImage(revision) {
    if (!imageGate.isCurrent(revision)) return false;
    imageGate.invalidate();
    createGate.invalidate();
    return true;
  }
  return Object.freeze({
    beginCreate() {
      return createGate.begin();
    },
    invalidateCreate() {
      createGate.invalidate();
    },
    isCurrentCreate(revision) {
      return createGate.isCurrent(revision);
    },
    beginImage() {
      createGate.invalidate();
      return imageGate.begin();
    },
    commitImage(revision) {
      return finishImage(revision);
    },
    failImage(revision) {
      return finishImage(revision);
    },
    isCurrentImage(revision) {
      return imageGate.isCurrent(revision);
    },
  });
}
