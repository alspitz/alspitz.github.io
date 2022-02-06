from pathlib import Path
import glob

src_path = Path(__file__).resolve().parent

class Blog:
  def __init__(self, srcfn, title, date=None):
    self.srcfn = srcfn
    self.title = title
    self.date = date
    self.prev = None
    self.next = None

  def __repr__(self):
    return self.srcfn

  def getlink(self):
    return "blog/%s.html" % self.srcfn

varmap = {}

def register(obj):
  varmap[obj.__name__.replace('_', '-')] = obj

blog_title = '<h2 class="blogtitle"> {blog.title} </h2>'
blog_date = '<p class="blogdate"> {blog.date}'
blog_header = """<title>{blog.title}</title>
<meta name="description" content="{blog.title}">
"""

empty_nav = lambda cls: f'<div class="{cls}"></div>'

@register
def blog_next(blog, **kwargs):
  cls = 'alignleft'
  if not blog.next:
    return empty_nav(cls)
  return f'<div class="{cls}"><a href="/{blog.next.getlink()}">Next</a></div>'

@register
def blog_prev(blog, **kwargs):
  cls = 'alignright'
  if not blog.prev:
    return empty_nav(cls)
  return f'<div class="{cls}"><a href="/{blog.prev.getlink()}">Prev</a></div>'

@register
def blog_home(blog_home=False, **kwargs):
  if blog_home:
    return empty_nav('aligncenter')
  return '<div class="aligncenter"><a href="/blog.html">Blog Home</a></div>'

varmap['blog-title'] = blog_title
varmap['blog-date'] = blog_date
varmap['blog-header'] = blog_header

source_files = [
  "index.html",
  "quadsim.html",
  "blog.html",
  "roterrormetrics.html"
]

copies = {
  '' : (
    "main.css",
    "katex.css",
  ),

  'fonts': glob.glob(str(src_path/"test"/"node_modules"/"katex"/"dist"/"fonts"/"*")),
}


# TODO Add all the rest: images, js, videos?
root_files = [
  "main.css",
  "katex.css",
]

blog_entries = [
  Blog("texmath",
       "Build-time LaTeX equations on the web using KaTeX",
       "2022-01-30"
  ),
  Blog("bonding_netctl",
       "How to set up network interface bonding with netctl / Archlinux",
       "2021-03-06"
  ),

  Blog("roslaunch_import",
       "How to use import statement inside of an eval in a ROS roslaunch file",
       "2021-02-05"
  ),

  Blog("pixracer_tx2_serial",
       "How to wire Pixracer serial to TX2 J121 UART 2",
       "2019"
  )
]

# Make prev, next pointers
for i in range(len(blog_entries)):
  blog = blog_entries[i]
  if i:
    blog.next = blog_entries[i - 1]

  if i < len(blog_entries) - 1:
    blog.prev = blog_entries[i + 1]
