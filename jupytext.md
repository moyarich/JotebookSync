# Jupytext Quick Start

Sync `.ipynb` notebooks with text files like `.py` or `.md`.

---

## 🚀 Setup

```bash
pip install jupytext
```

### Formats

| Format       | Example Setting    | Best For                                  | Notes                        |
| ------------ | ------------------ | ----------------------------------------- | ---------------------------- |
| `py:percent` | `ipynb,py:percent` | Code-first workflow (VS Code Run Cell UX) | Uses `# %%` cell markers     |
| `md`         | `ipynb,md`         | Readable docs / version control           | Clean diffs, no cell markers |
| `py` (light) | `ipynb,py`         | Minimal Python scripts                    | Less structure than percent  |

---

## 🧩 What is `py:percent`?

A Python script with cell markers that behave like notebook cells:

```python
# %%
print("Cell 1")

# %%
print("Cell 2")
```

- Use **`py:percent`** for VS Code “Run Cell” UX
- Use **`.md`** for readable, diff-friendly docs

---

## ⚡ Workflow

1. Open/run the `.ipynb` in VS Code
2. Edit the paired `.py` or `.md`
3. Sync changes (see **Sync** below)

Jupytext detects pairing via metadata or `jupytext.toml`.

---

## 🧩 Common Actions (CLI)

### Setup Pair

```bash
jupytext --set-formats ipynb,py:percent notebook.py
# or
jupytext --set-formats ipynb,md notebook.md
```

### Remove Pair (keep current format)

```bash
jupytext --set-formats py:percent notebook.py
# or
jupytext --set-formats md notebook.md
```

---

## 🔄 Sync

Sync a single file (direction auto-detected):

```bash
jupytext --sync notebook.ipynb
# or
jupytext --sync notebook.py
# or
jupytext --sync notebook.md
```

Batch examples:

```bash
jupytext --sync *.ipynb
jupytext --sync "model_*.ipynb"
```

---

## 🎯 Formatting

Format while syncing:

```bash
jupytext --pipe black notebook.ipynb
```

Install Black if needed:

```bash
pip install black
```

---

## 🧰 Troubleshooting

**Not syncing?**

```bash
jupytext --sync
```

**No outputs in `.py`/`.md`?**

- Outputs live in `.ipynb`
- `.py`/`.md` are source-only

**Check supported formats:**

```python
import json
from jupytext import formats as jf
print(json.dumps(jf.NOTEBOOK_EXTENSIONS))
```

---

## jupytext.toml

Create `jupytext.toml` in your project root and pick one pairing:

```toml
# Code-first (VS Code "Run Cell" UX)
formats = "ipynb,py:percent"

# Docs-first (clean diffs, readable Markdown)
# formats = "ipynb,md"
```

### ⚙️ Optional Config

```toml
# Keep all metadata (including outputs) in the notebook
notebook_metadata_filter = "all"
cell_metadata_filter = "all"

# Auto-format on sync
pipe = "black"
```

---

## 🧠 Key Idea

- `.ipynb` = execution + outputs
- `.py` / `.md` = editable source
- `--sync` keeps them aligned
