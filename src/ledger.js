// SPDX-FileCopyrightText: 2026 Sungmoon Park
// SPDX-License-Identifier: Apache-2.0
'use strict';
const { validate, contract } = require('./envelope');
const { X509Certificate } = require('node:crypto');
function authorize(e, identity) {
  const s = contract.sources[e.sourceOrg];
  if (!s || identity.getMSPID() !== s.mspId) throw new Error('source MSP');
  const subject = new X509Certificate(identity.getIDBytes()).subject;
  if (!subject.split('\n').includes('OU=client')) throw new Error('client OU');
  if (identity.getAttributeValue(contract.fabricPrincipal.writerAttribute.name) !== 'true')
    throw new Error('writer attribute');
  if (identity.getAttributeValue('hf.EnrollmentID') !== s.writerEnrollmentId)
    throw new Error('writer enrollment');
}
class EvidenceLedger {
  async execute(stub, identity, fn, args) {
    if (fn === 'RecordIntegrationResult') {
      if (args.length !== 1) throw new Error('one envelope required');
      const e = validate(JSON.parse(args[0]));
      authorize(e, identity);
      const key = 'evidence:' + e.recordId;
      if ((await stub.getState(key)).length) throw new Error('immutable record already exists');
      const record = { ...e, transactionId: stub.getTxID() };
      const bytes = Buffer.from(JSON.stringify(record));
      await stub.putState(key, bytes);
      stub.setEvent('EvidenceCommitted', bytes);
      return bytes;
    }
    if (fn === 'GetEvidence') {
      if (args.length !== 1 || !/^[a-f0-9]{24}$/.test(args[0])) throw new Error('record identifier');
      const bytes = await stub.getState('evidence:' + args[0]);
      if (!bytes.length) throw new Error('record absent');
      return bytes;
    }
    if (fn === 'ListEvidence') {
      if (args.length) throw new Error('unexpected arguments');
      const iterator = await stub.getStateByRange('evidence:', 'evidence;');
      const rows = []; let size = 2;
      try {
        for (;;) {
          const item = await iterator.next();
          if (item.value?.value?.length) {
            size += item.value.value.length + (rows.length ? 1 : 0);
            if (size > contract.query.maxResponseBytes || rows.length >= contract.query.maxResults)
              throw new Error('query overflow');
            rows.push(JSON.parse(item.value.value.toString()));
          }
          if (item.done) break;
        }
      } finally { await iterator.close(); }
      return Buffer.from(JSON.stringify(rows));
    }
    throw new Error('unknown function');
  }
}
module.exports = { EvidenceLedger, authorize };
