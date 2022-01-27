import os

from spec import source_files

CMD_OPEN = "{{"
CMD_CLOSE = "}}"

def process(src_path, out_path):
  fs = os.listdir(src_path)

  for src in fs:
    if not src.endswith('.html'):
      continue

    if src not in source_files:
      continue

    n_cmds = 0

    srctext = open(src_path / src, "r").read()

    outtext = srctext[:]

    cmdstart = srctext.find(CMD_OPEN)
    while cmdstart >= 0:
      cmdend = srctext.find(CMD_CLOSE, cmdstart)
      if cmdend < 0:
        break

      cmd = outtext[cmdstart : cmdend].removeprefix(CMD_OPEN).strip()

      if cmd.endswith('.html'):
        includetext = open(src_path / cmd, "r").read().rstrip()
        outtext = outtext[:cmdstart] + includetext + outtext[cmdend + len(CMD_CLOSE):]
        n_cmds += 1

      cmdstart = srctext.find(CMD_OPEN, cmdend)

    outfile = out_path / src
    print("Writing to file %s (with %d changes)" % (outfile, n_cmds))
    with open(outfile, "w") as f:
      f.write(outtext)

if __name__ == "__main__":
  from pathlib import Path
  src_path = Path(__file__).resolve().parent
  out_path = src_path.parent

  process(src_path, out_path)
