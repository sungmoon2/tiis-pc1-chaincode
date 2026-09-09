// SPDX-FileCopyrightText: 2026 Sungmoon Park
// SPDX-License-Identifier: Apache-2.0
'use strict';
if (process.env.ARTIFACT_MODE !== 'synthetic-local') throw new Error('synthetic mode required');
const shim = require('fabric-shim');
const { EvidenceLedger } = require('./ledger');
const ledger = new EvidenceLedger();
const implementation = {
  async Init() { return shim.success(); },
  async Invoke(stub) {
    try {
      const { fcn, params } = stub.getFunctionAndParameters();
      return shim.success(await ledger.execute(stub, new shim.ClientIdentity(stub), fcn, params));
    } catch (error) { return shim.error(error.message); }
  },
};
const ccid = process.env.CHAINCODE_ID;
if (!ccid || !/^[a-z0-9_.-]+:[a-f0-9]{64}$/.test(ccid)) throw new Error('package ID required');
// Plain transport is confined to an isolated synthetic network. Not deployment guidance.
shim.server(implementation, { ccid, address: '0.0.0.0:9999' }).start();
