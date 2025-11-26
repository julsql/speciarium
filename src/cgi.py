# Minimal stub to satisfy ete3 imports
def escape(s, quote=False):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
