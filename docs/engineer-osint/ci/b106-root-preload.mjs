// Use ONLY via explicit node --import for the test step. Never NODE_OPTIONS.
import assert from 'node:assert/strict';
import {activateInspection,optionsFromEnvironment} from './prepare-b106-fixture.mjs';
const options=optionsFromEnvironment();
assert.ok(options.approvedNotesCommit,'explicit independent pin required');
assert.ok(process.env.B106_EXTERNAL_INVENTORY_FIXTURE,'explicit exported fixture required');
activateInspection({...options,fixturePath:process.env.B106_EXTERNAL_INVENTORY_FIXTURE});
