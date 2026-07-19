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
      if (!imageGate.isCurrent(revision)) return false;
      imageGate.invalidate();
      createGate.invalidate();
      return true;
    },
    isCurrentImage(revision) {
      return imageGate.isCurrent(revision);
    },
  });
}
