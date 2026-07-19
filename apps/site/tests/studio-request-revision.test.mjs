import assert from "node:assert/strict";
import test from "node:test";
import {
  createStudioAsyncCoordinator,
  createStudioRequestGate,
} from "../app/lib/studio-request-revision.mjs";

test("settings and image invalidations discard an in-flight create response", () => {
  const gate = createStudioRequestGate();
  const request = gate.begin();

  gate.invalidate();

  assert.equal(gate.isCurrent(request), false);
});

test("a newer create request supersedes an older overlapping request", () => {
  const gate = createStudioRequestGate();
  const first = gate.begin();
  const second = gate.begin();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});

test("committing the latest processed image invalidates a create started during decoding", () => {
  const coordinator = createStudioAsyncCoordinator();
  const image = coordinator.beginImage();
  const create = coordinator.beginCreate();

  assert.equal(coordinator.isCurrentCreate(create), true);
  assert.equal(coordinator.commitImage(image), true);
  assert.equal(coordinator.isCurrentCreate(create), false);
});

test("a stale processed image cannot invalidate the current create request", () => {
  const coordinator = createStudioAsyncCoordinator();
  const staleImage = coordinator.beginImage();
  const currentImage = coordinator.beginImage();
  const create = coordinator.beginCreate();

  assert.equal(coordinator.commitImage(staleImage), false);
  assert.equal(coordinator.isCurrentCreate(create), true);
  assert.equal(coordinator.commitImage(currentImage), true);
  assert.equal(coordinator.isCurrentCreate(create), false);
});

test("failing the latest image transaction invalidates a create started during decoding", () => {
  const coordinator = createStudioAsyncCoordinator();
  const image = coordinator.beginImage();
  const create = coordinator.beginCreate();

  assert.equal(coordinator.failImage(image), true);
  assert.equal(coordinator.isCurrentImage(image), false);
  assert.equal(coordinator.isCurrentCreate(create), false);
});

test("a stale image failure cannot invalidate the current create request", () => {
  const coordinator = createStudioAsyncCoordinator();
  const staleImage = coordinator.beginImage();
  const currentImage = coordinator.beginImage();
  const create = coordinator.beginCreate();

  assert.equal(coordinator.failImage(staleImage), false);
  assert.equal(coordinator.isCurrentImage(currentImage), true);
  assert.equal(coordinator.isCurrentCreate(create), true);
});

test("dispose invalidates active image and create work before unmount", () => {
  const coordinator = createStudioAsyncCoordinator();
  const image = coordinator.beginImage();
  const create = coordinator.beginCreate();

  coordinator.dispose();

  assert.equal(coordinator.isCurrentImage(image), false);
  assert.equal(coordinator.isCurrentCreate(create), false);
});

test("the coordinator remains reusable after a Strict Mode cleanup cycle", () => {
  const coordinator = createStudioAsyncCoordinator();
  coordinator.dispose();

  const image = coordinator.beginImage();

  assert.equal(coordinator.isCurrentImage(image), true);
  assert.equal(coordinator.failImage(image), true);
});
