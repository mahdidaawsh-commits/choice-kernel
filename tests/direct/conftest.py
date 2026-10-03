import hashlib
import json
import os
import re
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]
CRITERIA = json.loads((ROOT / "config/criteria.json").read_text())
DOCS = {name: (ROOT / "fixtures" / (name + ".md")).read_text(encoding="utf-8") for name in ("alder", "birch", "cedar", "dominant", "limited", "unknown")}


@pytest.fixture
def direct_deploy(direct_deploy):
    def deploy(*args, **kwargs):
        return direct_deploy(*args, sdk_version="v0.2.16", **kwargs)
    return deploy


@pytest.fixture(autouse=True)
def windows_stdin_sharing_workaround(monkeypatch):
    if os.name != "nt":
        yield
        return
    from gltest.direct import loader
    original = loader._inject_message_to_fd0
    deferred = []
    def inject(vm):
        try:
            original(vm)
        except PermissionError as error:
            if error.winerror != 32:
                raise
            deferred.append(Path(error.filename))
    monkeypatch.setattr(loader, "_inject_message_to_fd0", inject)
    yield
    for file in deferred:
        try:
            file.unlink(missing_ok=True)
        except PermissionError:
            pass


def candidates(names):
    return [{"name": f"Candidate {index}", "url": f"https://raw.githubusercontent.com/example/choice-kernel/{'a'*40}/fixtures/{name}.md", "sha256": hashlib.sha256(DOCS[name].encode()).hexdigest()} for index, name in enumerate(names)]


def answer(names, left, right, decisions):
    rows = []
    for index, decision in enumerate(decisions):
        def quote(side):
            document = DOCS[names[side]]
            return "" if decision == "UNRESOLVED" else document.strip().split("\n\n")[index+1]
        rows.append({"criterion": CRITERIA[index]["id"], "decision": decision, "left_quote": quote(left), "right_quote": quote(right)})
    return {"judgments": rows}


def mock_pair(vm, names, left, right, decisions, independent=None, anchors=None, changed=None, report=None):
    vm.clear_mocks()
    for index in (left, right):
        row = candidates(names)[index]
        vm.mock_web(re.escape(row["url"]), {"status": 200, "body": changed if changed is not None and index == left else DOCS[names[index]]})
    vm.mock_llm(r".*CHOICEKERNEL-LEADER.*", json.dumps(report or answer(names, left, right, decisions)))
    vm.mock_llm(r".*CHOICEKERNEL-VALIDATOR.*", json.dumps(answer(names, left, right, independent or decisions)))
    vm.mock_llm(r".*CHOICEKERNEL-ANCHORS.*", json.dumps({"valid": anchors if anchors is not None else [True]*3}))


@pytest.fixture
def make_kernel(direct_deploy):
    return lambda names: direct_deploy(str(ROOT / "contracts/choice_kernel.py"), json.dumps(CRITERIA), json.dumps(candidates(names)))
