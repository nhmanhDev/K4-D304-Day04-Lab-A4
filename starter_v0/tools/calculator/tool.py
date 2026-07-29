from __future__ import annotations

import ast
import operator
from typing import Any

from tools._shared import err

_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPERATORS:
        return _OPERATORS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPERATORS:
        return _OPERATORS[type(node.op)](_eval_node(node.operand))
    raise ValueError(f"Unsupported expression syntax near: {ast.dump(node)}")


def calculate(expression: str = "") -> dict[str, Any]:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree.body)
        return {"tool": "calculate", "expression": expression, "result": result}
    except Exception as exc:
        return err("calculate", exc)
