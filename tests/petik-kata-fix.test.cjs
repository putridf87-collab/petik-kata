'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fix = require('../petik-kata-fix.js');

function makeFixture() {
  return {
    gamemapSteps: {
      gamemap: {
        elements: fix.EXPECTED_STAGE_LABELS.map((label, index) => ({
          label,
          canBeStartStage: index === 0 || index === 2 || index === 3,
          telemetry: { x: String(index * 10 + 1), y: String(index * 8 + 2), width: '4.375', height: '7.8406' },
          neighbors: index === 0 ? ['1'] : [String(index - 1), String(Math.min(5, index + 1))]
        }))
      }
    }
  };
}

test('only stage 1 (index 0) remains an initial start stage', () => {
  const config = makeFixture();
  const beforeCoordinates = config.gamemapSteps.gamemap.elements.map(stage => ({ ...stage.telemetry }));
  const result = fix.patchProgressionConfig(config);

  assert.deepEqual(result, { applied: true, startStageIndex: 0, stageCount: 6 });
  assert.deepEqual(
    config.gamemapSteps.gamemap.elements.map(stage => stage.canBeStartStage),
    [true, false, false, false, false, false]
  );
  assert.deepEqual(
    config.gamemapSteps.gamemap.elements.map(stage => stage.telemetry),
    beforeCoordinates,
    'hotspot coordinates must not be changed'
  );
});

test('fails closed if the stage count or labels do not match this activity', () => {
  const wrongCount = makeFixture();
  wrongCount.gamemapSteps.gamemap.elements.pop();
  assert.equal(fix.patchProgressionConfig(wrongCount).applied, false);

  const wrongLabel = makeFixture();
  wrongLabel.gamemapSteps.gamemap.elements[2].label = 'Stage edited';
  assert.equal(fix.patchProgressionConfig(wrongLabel).applied, false);
});

test('is idempotent when applied more than once', () => {
  const config = makeFixture();
  assert.equal(fix.patchProgressionConfig(config).applied, true);
  assert.equal(fix.patchProgressionConfig(config).applied, true);
  assert.deepEqual(
    config.gamemapSteps.gamemap.elements.map(stage => stage.canBeStartStage),
    [true, false, false, false, false, false]
  );
});

test('audited six-stage map fixture has the correct sequential starting point and path', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/source-map-config.json');
  const config = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const stages = config.gamemapSteps.gamemap.elements;
  const originalCoordinates = stages.map(stage => ({ ...stage.telemetry }));

  const result = fix.patchProgressionConfig(config);
  assert.equal(result.applied, true);
  assert.deepEqual(stages.map(stage => stage.label), fix.EXPECTED_STAGE_LABELS);
  assert.deepEqual(stages.map(stage => stage.canBeStartStage), [true, false, false, false, false, false]);
  assert.deepEqual(stages.map(stage => stage.telemetry), originalCoordinates);
  assert.deepEqual(config.gamemapSteps.gamemap.paths.map(edge => [edge.from, edge.to]), [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]);
});

test('embedded content JSON is updated without mutating coordinates', () => {
  const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/source-map-config.json'), 'utf8'));
  const integration = { contents: { ['cid-' + fix.CONTENT_ID]: { jsonContent: JSON.stringify(config) } } };
  const before = config.gamemapSteps.gamemap.elements.map(stage => ({ ...stage.telemetry }));
  const result = fix.patchEmbeddedContent(integration);
  const patched = JSON.parse(integration.contents['cid-' + fix.CONTENT_ID].jsonContent);

  assert.equal(result.applied, true);
  assert.deepEqual(patched.gamemapSteps.gamemap.elements.map(stage => stage.canBeStartStage), [true, false, false, false, false, false]);
  assert.deepEqual(patched.gamemapSteps.gamemap.elements.map(stage => stage.telemetry), before);
});
