import wx
import data

from libs.Patterns import *
from libs.EitherPattern import *
from libs.SequencePattern import *
from libs.WordPattern import *
from libs.XMLFormatter import *
from WordEditDialog import *

class TreeControl(wx.TreeCtrl):
	'''docstring for TreeControl'''
	def __init__(self, *args, **kwargs):
		'''Create the TreeControl.'''
		wx.TreeCtrl.__init__(self, *args, **kwargs)
		self.sequenceId = 1
		self.wordId = 1
		self.Bind(wx.EVT_TREE_ITEM_RIGHT_CLICK, self.OnShowPopup)


	def OnShowPopup(self, event):
		selectedItemData = self.GetItemData(event.GetItem())
		obj = selectedItemData.GetData()
		options = []

		if isinstance(obj, WordPattern):
			options = ['Add element', 'Delete']
		elif isinstance(obj, SequencePattern):
			options = ['Add either pattern', 'Add sequence pattern', 'Add word', 'Delete']
		elif isinstance(obj, EitherPattern):
			options = ['Add sequence pattern', 'Delete']
		elif isinstance(obj, Patterns):
			options = ['Add sequence']

		self.popupmenu = wx.Menu()

		for option in options:		
			item = self.popupmenu.Append(-1, option)
			if option == 'Add sequence pattern':
				self.popupmenu.AppendSeparator()
			if option == 'Add word':
				self.popupmenu.AppendSeparator()
			self.Bind(wx.EVT_MENU, self.OnSelectContext)

		self.PopupMenu(self.popupmenu, event.GetPoint())
		self.popupmenu.Destroy()

	def OnSelectContext(self, event):
		selectedId = event.GetId()
		selectedOption = self.popupmenu.GetLabelText(selectedId)
		selectedItem = self.GetSelection()
		selectedItemData = data.treePanel.treeControl.GetItemData(selectedItem)
		obj = selectedItemData.GetData()

		if selectedOption == 'Add sequence':
			sequence = SequencePattern(self.sequenceId)
			obj.add(sequence)
			self.AppendItem(selectedItem, 'sequence', data=wx.TreeItemData(sequence))
			self.sequenceId += 1
		elif selectedOption == 'Delete':
			parentItem = data.treePanel.treeControl.GetItemParent(selectedItem)
			parentItemData = data.treePanel.treeControl.GetItemData(parentItem)
			parentObj = parentItemData.GetData()
			parentObj.remove(obj)
			self.Delete(selectedItem)
		elif selectedOption == 'Add either pattern':
			either = EitherPattern()
			obj.add(either)
			self.AppendItem(selectedItem, 'either', data=wx.TreeItemData(either))
		elif selectedOption == 'Add word':
			word = WordPattern(self.wordId)
			self.wordId += 1
			obj.add(word)
			self.AppendItem(selectedItem, 'word', data=wx.TreeItemData(word))
		elif selectedOption == 'Add sequence pattern':
			sequence = SequencePattern(self.sequenceId)
			obj.add(sequence)
			self.AppendItem(selectedItem, 'sequence', data=wx.TreeItemData(sequence))
			self.sequenceId += 1
		elif selectedOption == 'Add element':
			data.wordPanel.OnAdd(event)

		# Update the live panel
		data.livePanel.update()

		self.ExpandAll()

	def CreateContextMenu(self, menu):
		item = self._menu.Append(wx.ID_ADD)
		self.Bind(wx.EVT_MENU, self.OnSelectContext, item)
		item = self._menu.Append(wx.ID_DELETE)
		self.Bind(wx.EVT_MENU, self.OnSelectContext, item)
		item = self._menu.Append(wx.ID_EDIT)
		self.Bind(wx.EVT_MENU, self.OnSelectContext, item)

class TreePanel(wx.Panel):
	'''docstring for TreePanel'''
	def __init__(self, *args, **kwargs):
		'''Create the TreePanel.'''
		wx.Panel.__init__(self, *args, **kwargs)

		# #####
		# SIZER
		# #####
		sizer = wx.BoxSizer(wx.VERTICAL)

		# ########
		# CONTROLS
		# ########
		self.treeControl = TreeControl(self, 1, style=wx.TR_DEFAULT_STYLE | wx.TR_FULL_ROW_HIGHLIGHT)

		sizer.Add(self.treeControl, proportion=1, flag=wx.EXPAND)

		self.SetSizer(sizer)
