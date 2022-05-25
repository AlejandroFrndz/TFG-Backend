import wx
import data
import xml.dom.minidom

from libs.Patterns import *
from libs.EitherPattern import *
from libs.SequencePattern import *
from libs.WordPattern import *
from libs.XMLFormatter import *

class LivePanel(wx.Panel):
	'''docstring for LivePanel'''
	def __init__(self, *args, **kwargs):
		'''Create the LivePanel.'''
		wx.Panel.__init__(self, *args, **kwargs)

		# #####
		# SIZER
		# #####
		sizer = wx.BoxSizer(wx.VERTICAL)

		# ########
		# CONTROLS
		# ########
		self.textControl = wx.TextCtrl(self, style=wx.TE_MULTILINE|wx.TE_READONLY)

		sizer.Add(self.textControl, proportion=1, flag=wx.EXPAND)

		self.SetSizer(sizer)

	def update(self):
		data.patterns.accept(data.xmlformatter)
		xmlstring = data.xmlformatter.format()
		xmlPretty = xml.dom.minidom.parseString(xmlstring)
		xmlPretty = xmlPretty.toprettyxml()
		data.livePanel.textControl.SetValue(xmlPretty)