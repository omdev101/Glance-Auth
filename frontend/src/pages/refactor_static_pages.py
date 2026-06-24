import re

footer_html = """
      <footer className="p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground font-medium z-10 mt-auto border-t border-border/50">
        <div>FaceAttend Internal Portal • System Operational</div>
        <div className="flex gap-6 mt-2">
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Support</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace Navbar with SimpleNavbar
    content = re.sub(r'import Navbar from \'@/components/Navbar\';', 'import SimpleNavbar from \'@/components/SimpleNavbar\';', content)
    content = re.sub(r'<Navbar />', '<SimpleNavbar />', content)

    # 2. Fix the wrapper styling to ensure dark mode background and flex layout
    # The current wrapper is usually `<div className="min-h-screen flex flex-col">` or similar
    # In privacy/terms it might be bg-gray-50 etc.
    content = re.sub(
        r'<div className="min-h-screen[^"]*">',
        '<div className="min-h-screen flex flex-col bg-background relative overflow-hidden">',
        content, count=1
    )

    # Add background glow (optional but nice)
    bg_glow = """      {/* Subtle background glow */}
      <div className="fixed top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>"""
    content = content.replace('<SimpleNavbar />', f'<SimpleNavbar />\n{bg_glow}')

    # 3. Fix the footer
    # Find the existing footer and replace it
    footer_pattern = r'<footer className="bg-gray-900.*?</footer>'
    if re.search(footer_pattern, content, re.DOTALL):
        content = re.sub(footer_pattern, footer_html, content, flags=re.DOTALL)
    else:
        # Just append it before the last </div>
        content = re.sub(r'(</main>.*?)</div>', r'\1' + footer_html + '\n    </div>', content, flags=re.DOTALL)

    # 4. Remove any explicit "back to home" links since SimpleNavbar has a back button
    back_pattern = r'<div className="mb-6">\s*<Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">\s*<ArrowLeft className="mr-2 h-4 w-4" />\s*Back to Home\s*</Link>\s*</div>'
    content = re.sub(back_pattern, '', content)

    # 5. Fix card/input styles
    # Replace hardcoded focus rings and borders
    content = content.replace('focus:ring-college-500', 'focus:ring-ring')
    content = content.replace('bg-white', 'bg-card')
    content = content.replace('bg-gray-50', 'bg-muted')
    content = content.replace('text-gray-900', 'text-foreground')
    content = content.replace('text-gray-600', 'text-muted-foreground')
    content = content.replace('border-gray-200', 'border-border')
    content = content.replace('className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"', 'className="w-full px-4 py-3 border border-border rounded-xl bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-foreground"')

    # Fix markdown prose wrappers for Terms and Privacy
    content = content.replace('prose prose-college max-w-none', 'prose prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for p in ['Contact.tsx', 'Privacy.tsx', 'Terms.tsx']:
    path = f'h:/NextZen_main/frontend/src/pages/{p}'
    try:
        process_file(path)
        print(f"Processed {p}")
    except Exception as e:
        print(f"Error processing {p}: {e}")

