import wx
import sys
import data
import xml.dom.minidom
import webbrowser

from TreePanel import *
from WordPanel import *
from SequencePanel import *
from LivePanel import *

from libs.Patterns import *
from libs.EitherPattern import *
from libs.SequencePattern import *
from libs.WordPattern import *
from libs.XMLFormatter import *

class MWEFrame(wx.Frame):
	'''docstring for MWEFrame'''
	def __init__(self, *args, **kwargs):
		'''Create the MWEFrame.'''
		wx.Frame.__init__(self, *args, **kwargs)

		# #####
		# SIZER
		# #####
		sizer = wx.BoxSizer(wx.HORIZONTAL)
		sizer2 = wx.BoxSizer(wx.VERTICAL)

		# #######
		# MENUBAR
		# #######
		menubar = wx.MenuBar()
		fileMenu = wx.Menu()
		viewMenu = wx.Menu()
		helpMenu = wx.Menu()
		# File menu item
		fileMenuItemSaveAsXML = wx.MenuItem(fileMenu, wx.ID_ANY, '&Save as XML\tCtrl+S')
		fileMenuItemQuit = wx.MenuItem(fileMenu, wx.ID_EXIT, '&Quit\tCtrl+Q')
		fileMenu.AppendItem(fileMenuItemSaveAsXML)
		fileMenu.AppendItem(fileMenuItemQuit)
		# View menu item
		viewMenuShowLiveXML = wx.MenuItem(viewMenu, wx.ID_ANY, '&Show live XML')
		viewMenu.AppendItem(viewMenuShowLiveXML)
		# Help menu item
		helpMenuDocumentation = wx.MenuItem(helpMenu, wx.ID_ANY, '&Documentation')
		helpMenu.AppendItem(helpMenuDocumentation)
		# Add the menus the menu bar
		menubar.Append(fileMenu, '&File')
		menubar.Append(viewMenu, '&View')
		menubar.Append(helpMenu, '&Help')
		# Set the menu bar
		self.SetMenuBar(menubar)

		# Create three panels (tree, word edit and sequence edit pattern)
		data.treePanel = TreePanel(self)
		data.wordPanel = WordPanel(self)
		data.sequencePanel = SequencePanel(self)
		data.livePanel = LivePanel(self)
		self.emptyPanel = wx.Panel(self)
		# We first hide SequencePanel, WordPanel, LivePanel
		data.wordPanel.Hide()
		data.sequencePanel.Hide()
		data.livePanel.Show()
		self.emptyPanel.Show()

		tree = data.treePanel.treeControl

		# Add a root the tree control
		root = tree.AddRoot('patterns', data=wx.TreeItemData(Patterns()))

		# Initialise some variables
		root = data.treePanel.treeControl.GetRootItem()
		rootItemData = data.treePanel.treeControl.GetItemData(root)
		data.patterns = rootItemData.GetData()
		data.xmlformatter = XMLFormatter()

		# Update the live panel
		data.livePanel.update()

		# Add the panels to the sizer
		sizer.Add(data.treePanel, proportion=1, flag=wx.EXPAND)
		sizer.Add(data.wordPanel, proportion=1, flag=wx.EXPAND)
		sizer.Add(data.sequencePanel, proportion=1, flag=wx.EXPAND)
		sizer.Add(self.emptyPanel, proportion=1, flag=wx.EXPAND)
		sizer2.Add(sizer, proportion=1, flag=wx.EXPAND)
		sizer2.Add(data.livePanel, proportion=0, flag=wx.EXPAND)

		self.SetAutoLayout(True)
		self.SetSizer(sizer2)
		self.Layout()

		# ######
		# EVENTS
		# ######
		# This event is used to switch between panels (WordPanel/SequencePanel)
		self.Bind(wx.EVT_TREE_SEL_CHANGED, self.OnSelectedTreeItem, data.treePanel.treeControl)
		# This event is used to quit the application
		self.Bind(wx.EVT_MENU, self.OnQuit, fileMenuItemQuit)
		# This event is used to display a file dialog
		self.Bind(wx.EVT_MENU, self.OnGenerateXML, fileMenuItemSaveAsXML)
		# This event is used to show/hide the XML live panel
		self.Bind(wx.EVT_MENU, self.OnShowLivePanel, viewMenuShowLiveXML)
		# This event is used to open the online documentation page
		self.Bind(wx.EVT_MENU, self.OnDocumentation, helpMenuDocumentation)

	def OnSelectedTreeItem(self, event):
		tree = data.treePanel.treeControl
		selectedItemData = tree.GetItemData(event.GetItem())
		obj = selectedItemData.GetData()

		if isinstance(obj, WordPattern):
			data.sequencePanel.Hide()
			self.emptyPanel.Hide()

			# Get values from the object and print them on the panel
			data.wordPanel.idTextControl.SetValue(unicode(obj.id))

			# Delete all items from the list before adding the new one
			data.wordPanel.dictionariesListControl.DeleteAllItems()

			for key in obj.positive:
				for value in obj.positive[key]:
					index = data.wordPanel.dictionariesListControl.InsertStringItem(sys.maxint, key)
					data.wordPanel.dictionariesListControl.SetStringItem(index, 1, value)
					data.wordPanel.dictionariesListControl.SetStringItem(index, 2, unicode(False))

			for key in obj.negative:
				for value in obj.negative[key]:
					index = data.wordPanel.dictionariesListControl.InsertStringItem(sys.maxint, key)
					data.wordPanel.dictionariesListControl.SetStringItem(index, 1, value)
					data.wordPanel.dictionariesListControl.SetStringItem(index, 2, unicode(True))

			data.wordPanel.Show()
		elif isinstance(obj, SequencePattern):
			data.wordPanel.Hide()
			self.emptyPanel.Hide()


			# Get values from the object and print them on the panel
			data.sequencePanel.idTextControl.SetValue(unicode(obj.id))
			if obj.repeat is None:
				data.sequencePanel.repeatComboBox.SetStringSelection('')
			else:
				data.sequencePanel.repeatComboBox.SetValue(obj.repeat)

			if obj.ignore:
				data.sequencePanel.ignoreTrueRadioButton.SetValue(True)
			else:
				data.sequencePanel.ignoreFalseRadioButton.SetValue(True)

			data.sequencePanel.Show()
		elif isinstance(obj, EitherPattern) or isinstance(obj, Patterns):
			data.wordPanel.Hide()
			data.sequencePanel.Hide()
			self.emptyPanel.Show()
		self.Layout()

	def OnQuit(self, event):
		self.Close()

	def OnGenerateXML(self, event):
		data.patterns.accept(data.xmlformatter)
		xmlstring = data.xmlformatter.format()
		xmlPretty = xml.dom.minidom.parseString(xmlstring)
		xmlPretty = xmlPretty.toprettyxml()
		saveFileDialog = wx.FileDialog(self, 'Save XML file', '~', 'pattern.xml', 'XML files (*.xml)|*.xml', wx.FD_SAVE | wx.FD_OVERWRITE_PROMPT)

		if saveFileDialog.ShowModal() == wx.ID_CANCEL:
			return

		file = open(saveFileDialog.GetPath(), 'w')
		file.write(xmlPretty)

		commandline = 'python candidates.py -p %s CORPUS' %file.name
		message = 'To extract candidates, run:\n%s' %commandline
		caption = 'Saved file in %s' %file.name
		wx.MessageBox(message, caption, style=wx.OK)

		file.close()

	def OnShowLivePanel(self, event):
		if data.livePanel.IsShown():
			data.livePanel.Hide()
		else:
			data.livePanel.Show()
		self.Layout()


	def OnDocumentation(self, event):
		# webbrowser.open('http://mwetoolkit.sourceforge.net', 2)
		pass
