from pathlib import Path
import glob

src_path = Path(__file__).resolve().parent

class Blog:
  def __init__(self, srcfn, title, date=None):
    self.srcfn = srcfn
    self.title = title
    self.date = date

  def __repr__(self):
    return self.srcfn

blog_title = '<h2 class="blogtitle"> {blog.title} </h2>'
blog_date = '<p class="blogdate"> {blog.date}'

blog_header = """<title>{blog.title}</title>
<meta name="description" content="{blog.title}">
"""

varmap = {
  'blog-title' : blog_title,
  'blog-date'  : blog_date,
  'blog-header' : blog_header,
}

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
