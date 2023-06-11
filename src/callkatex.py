from pathlib import Path
import subprocess

def htmlfromlatex(latex_s):
  root_path = Path(__file__).resolve().parent.parent
  proc = subprocess.run(
    ["node", root_path/"node_modules"/"katex"/"cli.js", "-d"],
    input=latex_s.encode('utf-8'),
    capture_output=True
  )
  if proc.returncode:
    print(f"ERROR: Calling katex failed:")
    print(proc.stderr.decode('utf-8'))
    return None

  return proc.stdout.decode('utf-8').strip()

if __name__ == "__main__":
  latex_s = "x^2"
  print(htmlfromlatex(latex_s))
