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

# TODO Add all the rest: images, js, videos?
root_files = [
  "main.css",
]

blog_entries = [
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
       "2019-??-??"
  )
]
