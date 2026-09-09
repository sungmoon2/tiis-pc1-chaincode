#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Sungmoon Park
# SPDX-License-Identifier: Apache-2.0
"""Deterministic CCaaS endpoint package. Source is bound separately by Git/archive."""
import gzip, hashlib, io, json, sys, tarfile
from pathlib import Path
def archive(files):
    stream=io.BytesIO()
    with tarfile.open(fileobj=stream,mode='w',format=tarfile.USTAR_FORMAT) as tar:
        for name,raw in sorted(files.items()):
            entry=tarfile.TarInfo(name);entry.size=len(raw);entry.mode=0o644
            entry.uid=entry.gid=entry.mtime=0;entry.uname=entry.gname=''
            tar.addfile(entry,io.BytesIO(raw))
    return gzip.compress(stream.getvalue(),mtime=0)
def package():
    connection=json.dumps(dict(address='chaincode:9999',dial_timeout='10s',tls_required=False),
                          sort_keys=True,separators=(',',':')).encode()
    metadata=b'{"label":"evidence_0.1.0","path":"","type":"ccaas"}'
    return archive({'metadata.json':metadata,'code.tar.gz':archive({'connection.json':connection})})
if __name__=='__main__':
    target=Path(sys.argv[1])
    first,second=package(),package()
    assert first==second
    with target.open('xb') as stream: stream.write(first)
    print(json.dumps(dict(bytes=len(first),sha256=hashlib.sha256(first).hexdigest(),
        package_id='evidence_0.1.0:'+hashlib.sha256(first).hexdigest(),twice_identical=True,
        source_version='0.1.0',lifecycle_version='0.1.0',sequence=1,contract='1.2.0',
        scope='NEW_SYNTHETIC_CCAAS_NOT_HISTORICAL_SOURCE_PACKAGE')))
