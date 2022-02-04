from pathlib import Path
import subprocess

def htmlfromlatex(latex_s):
  proc = subprocess.run(
    ["node", Path("test")/"node_modules"/"katex"/"cli.js", "-d"],
    input=latex_s.encode('utf-8'),
    capture_output=True
  )
  return proc.stdout.decode('utf-8').strip()

if __name__ == "__main__":
  latex_s = "x^2"
  print(htmlfromlatex(latex_s))
