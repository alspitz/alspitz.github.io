import os
import shutil

import spec
from util import getf

from callkatex import htmlfromlatex

CMD_OPEN = "{{"
CMD_CLOSE = "}}"

class Result:
  def __init__(self, text, n_cmds):
    self.text = text
    self.n_cmds = n_cmds

def include(fn):
  return f"{CMD_OPEN} {fn} {CMD_CLOSE}"

def cmd_include_html(src_path, cmd, context):
  return getf(src_path/cmd).rstrip()

def cmd_blog_latest(src_path, cmd, context):
  context['blog'] = spec.blog_entries[0]
  context['blog_home'] = True
  return include("blog_entry_template.html")

def cmd_blog_body(src_path, cmd, context):
  return include(context['blog'].getlink())

def cmd_for(src_path, cmd, context):
  forw, varname, inw, listw, itertext = cmd.split(None, 4)
  assert forw == "for"
  if inw != "in":
    print("\n\tERROR: Invalid for syntax. Use \"in\"")
    return None

  if not hasattr(spec, listw):
    print("\n\tERROR: object \"%s\" not found" % listw)
    return None

  text = ""
  listo = getattr(spec, listw)
  for obj in listo:
    text += itertext.format(**{**context, varname : obj})

  return text.strip()

def cmd_headerlink_class(src_path, cmd, context):
  rest = cmd.removeprefix("headerlink-class").strip()
  cls = "headerlink"
  if rest and rest in context['filename'].stem:
    cls += " headerlinkcurrent"

  return cls

def cmd_math(src_paths, cmd, context):
  latex_s = cmd.removeprefix("math").strip()
  return htmlfromlatex(latex_s)

def make_blogs(src_path, blogs, out_path):
  for blog in blogs:
    res = process_sourcefile(src_path/"blog_page_template.html", dict(blog=blog))
    write_file(out_path/blog.getlink(), res)

def cmd_escape(src_path, cmd, context):
  return f"{CMD_OPEN} {cmd[7:]}{CMD_CLOSE}"

cmdmap = {
  'blog-latest' : cmd_blog_latest,
  'blog-body'   : cmd_blog_body,
  'headerlink-class' : cmd_headerlink_class,
  'for' : cmd_for,
  'math' : cmd_math,
  #'blog-links'  cmd_blog_links,
}

def find_cmdend(text, cmdstart):
  level = 0
  i = cmdstart + len(CMD_OPEN)
  while i + 1 < len(text):
    if not level and text[i : i + len(CMD_CLOSE)] == CMD_CLOSE:
      return i + len(CMD_CLOSE)

    elif text[i] == '{':
      level += 1

    elif text[i] == '}':
      level -= 1

    i += 1

  return -1

def process_sourcefile(filename, context=None, debug=False):
  print("%s %s" %  (filename, context), end='... ')
  text = getf(filename)
  if context is None:
    context = dict()

  context.update(filename=filename)

  n_cmds = 0
  cmdstart = 0
  while 1:
    cmdstart = text.find(CMD_OPEN, cmdstart)
    if cmdstart < 0:
      break

    cmdend = find_cmdend(text, cmdstart)
    if cmdend < 0:
      print(f"ERROR: Unclosed command starting at {filename}:{cmdstart}")
      break

    # Seems bad and hacky. Let's see if it will last...
    # Done so that html templates don't have to escape curly brackets.
    # The choice {{ <cmd> }} for templates clashes with Python's str.format because
    # "{{ text }}".format() returns "{ text }".
    use_format = False
    # Newlines are useful for for loops. Only remove spaces and tabs.
    fullcmd = text[cmdstart : cmdend - len(CMD_CLOSE)].removeprefix(CMD_OPEN).strip(' \t')
    if debug:
      print("\n\tProcessing cmd", fullcmd)
      input()
    n_cmds += 1

    cmdwords = fullcmd.split()
    cmd = cmdwords[0]

    if fullcmd.endswith('.html'):
      includetext = cmd_include_html(src_path, fullcmd, context)
    elif cmd in cmdmap:
      includetext = cmdmap[cmd](src_path, fullcmd, context)
    elif cmd in spec.varmap:
      includetext = spec.varmap[cmd]
      use_format = True
    elif cmd == 'escape':
      includetext = cmd_escape(src_path, fullcmd, context)
    else:
      print("\n\tERROR: Unhandled jimothy command %s" % fullcmd)
      cmdstart = cmdend
      continue

    if includetext is None:
      print("\n\tERROR: Cmd \"%s\" failed." % fullcmd)
      includetext = ""

    # Assume it's a function
    if not isinstance(includetext, str):
      includetext = includetext(**context)
    elif use_format:
      includetext = includetext.format(**context)

    text = text[:cmdstart] + includetext + text[cmdend:]
    if debug:
      print(text[cmdstart:cmdstart + 20])

    if cmd =='escape':
      cmdstart = cmdend

  return Result(text, n_cmds)

def write_file(outfile, res):
  write_file = True
  if outfile.exists():
    oldout = getf(outfile)
    if oldout == res.text:
      print("same")
      write_file = False

  if write_file:
    if ask_to_write:
      print("write to %s (%d macros). Press Enter to continue" % (outfile, res.n_cmds))
      input()
    else:
      print()

    with open(outfile, "w") as f:
      f.write(res.text)

def process(path, files, out_path):
  fs = os.listdir(path)

  for fname in os.listdir(path):
    if fname not in files:
      continue

    res = process_sourcefile(path/fname)
    write_file(out_path/fname, res)

if __name__ == "__main__":
  from pathlib import Path

  ask_to_write = False

  src_path = Path(__file__).resolve().parent
  root_path = src_path.parent
  out_path = root_path.parent / "alspitz-deploy"

  for dest, files in spec.copies.items():
    for fname in files:
      src = root_path / fname
      dst = out_path / dest
      os.makedirs(dst, exist_ok=True)
      shutil.copy(src, dst)

  process(src_path, spec.source_files, out_path)
  make_blogs(src_path, spec.blog_entries, out_path)
