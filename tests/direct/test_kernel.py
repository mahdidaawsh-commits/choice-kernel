import copy
import json
import pytest
from conftest import ROOT, CRITERIA, DOCS, candidates, answer, mock_pair


def compare(kernel, vm, names, left, right, decisions):
    mock_pair(vm, names, left, right, decisions)
    kernel.compare(left, right)


def test_cycle_preserves_all_cowinners(make_kernel, direct_vm):
    names = ["alder", "birch", "cedar"]
    kernel = make_kernel(names)
    # Arbitrary execution order cannot change matrix slots or commitment order.
    compare(kernel, direct_vm, names, 1, 2, ["LEFT", "LEFT", "RIGHT"])
    compare(kernel, direct_vm, names, 0, 2, ["LEFT", "RIGHT", "RIGHT"])
    compare(kernel, direct_vm, names, 0, 1, ["LEFT", "RIGHT", "LEFT"])
    kernel.finalize()
    outcome = kernel.get_state()["outcome"]
    assert outcome["status"] == "CO_WINNERS" and outcome["winners"] == [0, 1, 2]
    assert outcome["direct_strengths"] == [[0, 2, 0], [0, 0, 2], [2, 0, 0]]
    assert outcome["strongest_paths"] == [[0, 2, 2], [2, 0, 2], [2, 2, 0]]


@pytest.mark.parametrize("names,decisions,status,winners", [
    (["dominant", "limited"], ["LEFT"]*3, "UNIQUE", [0]),
    (["dominant", "dominant"], ["TIE"]*3, "CO_WINNERS", [0,1]),
    (["dominant", "unknown"], ["UNRESOLVED"]*3, "UNRESOLVED", []),
])
def test_distinct_terminal_outcomes(make_kernel, direct_vm, names, decisions, status, winners):
    kernel = make_kernel(names)
    compare(kernel, direct_vm, names, 0, 1, decisions)
    assert direct_vm.run_validator() is True
    kernel.finalize()
    assert kernel.get_state()["outcome"]["status"] == status
    assert kernel.get_state()["outcome"]["winners"] == winners


def test_incomplete_cannot_finalize(make_kernel, direct_vm):
    kernel = make_kernel(["alder", "birch", "cedar"])
    with direct_vm.expect_revert("Incomplete tournament"):
        kernel.finalize()
    assert kernel.get_state()["outcome"] == {"status":"OPEN"}


def test_duplicate_and_terminal_writes_blocked(make_kernel, direct_vm):
    names = ["dominant", "limited"]
    kernel = make_kernel(names)
    compare(kernel, direct_vm, names, 0, 1, ["LEFT"]*3)
    with direct_vm.expect_revert("already frozen"):
        kernel.compare(0, 1)
    kernel.finalize()
    with direct_vm.expect_revert("Already finalized"):
        kernel.finalize()


@pytest.mark.parametrize("left,right", [(1,0),(0,0),(0,2)])
def test_invalid_pair(make_kernel, direct_vm, left, right):
    kernel = make_kernel(["dominant", "limited"])
    with direct_vm.expect_revert("ordered distinct"):
        kernel.compare(left, right)


def test_hash_change_does_not_complete(make_kernel, direct_vm):
    names = ["dominant", "limited"]
    kernel = make_kernel(names)
    mock_pair(direct_vm, names, 0, 1, ["LEFT"]*3, changed=DOCS["dominant"]+"altered")
    with direct_vm.expect_revert("hash or size mismatch"):
        kernel.compare(0,1)
    assert kernel.get_state()["completed"] == 0


def test_forged_quote_does_not_complete(make_kernel, direct_vm):
    names = ["dominant", "limited"]
    kernel = make_kernel(names)
    report = answer(names,0,1,["LEFT"]*3)
    report["judgments"][0]["left_quote"] = "This is a fabricated offline capability."
    mock_pair(direct_vm,names,0,1,["LEFT"]*3,report=report)
    with direct_vm.expect_revert("Unsupported comparative quote"):
        kernel.compare(0,1)
    assert kernel.get_state()["completed"] == 0


@pytest.mark.parametrize("decisions,independent", [(["LEFT"]*3,["RIGHT","LEFT","LEFT"]),(["TIE"]*3,["LEFT"]*3)])
def test_validator_rejects_direction_and_false_tie(make_kernel,direct_vm,decisions,independent):
    names=["dominant","limited"]
    kernel=make_kernel(names)
    compare(kernel,direct_vm,names,0,1,decisions)
    mock_pair(direct_vm,names,0,1,decisions,independent=independent)
    assert direct_vm.run_validator() is False


def test_validator_rejects_false_uncertainty(make_kernel,direct_vm):
    names=["dominant","limited"]
    kernel=make_kernel(names)
    compare(kernel,direct_vm,names,0,1,["UNRESOLVED"]*3)
    mock_pair(direct_vm,names,0,1,["UNRESOLVED"]*3,independent=["LEFT"]*3)
    assert direct_vm.run_validator() is False


def test_validator_rejects_irrelevant_existing_quote(make_kernel,direct_vm):
    names=["dominant","limited"]
    kernel=make_kernel(names)
    compare(kernel,direct_vm,names,0,1,["LEFT"]*3)
    mock_pair(direct_vm,names,0,1,["LEFT"]*3,anchors=[False,True,True])
    assert direct_vm.run_validator() is False


def test_validator_refetches_and_checks_hash(make_kernel,direct_vm):
    names=["dominant","limited"]
    kernel=make_kernel(names)
    compare(kernel,direct_vm,names,0,1,["LEFT"]*3)
    mock_pair(direct_vm,names,0,1,["LEFT"]*3,changed=DOCS["dominant"]+"changed")
    assert direct_vm.run_validator() is False


def test_validator_rejects_forged_source_binding(make_kernel,direct_vm):
    names=["dominant","limited"]
    kernel=make_kernel(names)
    compare(kernel,direct_vm,names,0,1,["LEFT"]*3)
    proposed={**answer(names,0,1,["LEFT"]*3),"source_hashes":["0"*64,"0"*64]}
    assert direct_vm.run_validator(leader_result=proposed) is False


def test_mutable_document_rejected(direct_deploy,direct_vm):
    rows=candidates(["dominant","limited"])
    rows[0]["url"]=rows[0]["url"].replace("a"*40,"main")
    with direct_vm.expect_revert("commit-pinned"):
        direct_deploy(str(ROOT/"contracts/choice_kernel.py"),json.dumps(CRITERIA),json.dumps(rows))


def test_duplicate_candidate_rejected(direct_deploy,direct_vm):
    rows=candidates(["dominant","limited"])
    rows[1]["name"]=rows[0]["name"]
    with direct_vm.expect_revert("duplicate candidate"):
        direct_deploy(str(ROOT/"contracts/choice_kernel.py"),json.dumps(CRITERIA),json.dumps(rows))
