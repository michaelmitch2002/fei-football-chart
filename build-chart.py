"""Refresh chart.html from the standalone chart export, preserving the introduction."""
from pathlib import Path

project = Path(__file__).resolve().parent
source = project.parent / 'FEI Schedule Strength.html'
chart = source.read_text()
navigation = '''<nav aria-label="Main navigation" style="display:flex;flex-wrap:wrap;gap:12px 28px;margin:0 0 16px;font:400 16px/1.5 system-ui,sans-serif"><a href="index.html" style="color:inherit;text-underline-offset:4px">Introduction</a><a href="chart.html" aria-current="page" style="color:inherit;text-underline-offset:4px">Explore the rankings</a></nav>'''
chart = chart.replace('<body>', '<body>\n' + navigation, 1)
chart = chart.replace('height:calc(100vh - 2rem)', 'height:calc(100vh - 5rem)', 1)
(project / 'chart.html').write_text(chart)
print(project / 'chart.html')
