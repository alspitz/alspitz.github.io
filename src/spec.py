class Blog:
  def __init__(self, srcfn, title, date=None):
    self.srcfn = srcfn
    self.title = title
    self.date = date


blog_title = '<h2 class="blogtitle"> {blog.title} </h2>'
blog_date = '<p class="blogdate"> {blog.date}'

blog_header = """<!DOCTYPE html>
<title>{blog.title}</title>
<link rel="icon" type="image/png" href="/images/profile-square-tiny.png">
<link rel="stylesheet" href="/main.css">
<meta name="viewport" content="width=device-width, initial-scale=1.0,minimum-scale=1.0">"""

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
