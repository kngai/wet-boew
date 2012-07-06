/*!
 * Web Experience Toolkit (WET) / Bo�te � outils de l'exp�rience Web (BOEW)
 * www.tbs.gc.ca/ws-nw/wet-boew/terms / www.sct.gc.ca/ws-nw/wet-boew/conditions
 */
/**
 * Table Parser - Table usability - Core plugin
 *
 * @author: Pierre Dubois
 *
 */
(function ($) {
	var _pe = window.pe || {
		fn : {}
	};
	
	
	_pe.fn.parsertable = {
		type : 'plugin',
		_exec : function (elm) {
			
			// elm need to be a table
			if($(elm).get(0).nodeName.toLowerCase() != 'table'){
				return;
			}
			
			
			var obj = elm;

			// Event handler for issue error found durring the table parsing process
			var errorTrigger = function(err, obj){
				$(obj).trigger('parser.table.error', err, obj);
				console.log("Trigger ERROR: " + err); // Debug Mode
			}

			// Check if this table was already parsed, if yes we exit by throwing an error
			if($(obj).tblparser){
				errorTrigger("The table was already parsed, Why you want to parse it a second time ?", obj);
				return;
			}
		
		
		/*
		
			+-----------------------------------------------------+
			| FYI - Here the value and signification of each type |
			+------+---------------+------------------------------+
			| Type | Signification | Technicality
			+------+---------------+-------------------------------
			|  1   | Header        | TH element only
			+------+---------------+-------------------------------
			|  2   | Data          | TD element only
			+------+---------------+-------------------------------
			|  3   | Summary       | TD element and TD of type 2 exist
			+------+---------------+-------------------------------
			|  4   | Key           | TD element applicable to right TH, Only available on row
			+------+---------------+-------------------------------
			|  5   | Description   | TD element applicable to left or top TH
			+------+---------------+-------------------------------
			|  6   | Layout        | Can be only: Top Left cell or/and Summmary group intersection
			+------+---------------+-------------------------------
			|  7   | Header Group  | TH element only, visual heading grouping, this type are an extension of the type 1
			+------+---------------+-------------------------------
			 

		*/
		
		var groupZero = {
			allParserObj: [], 
			nbDescriptionRow: 0 // To remove ??
		};
		
		$(obj).data().tblparser = groupZero;
		
		
		var colgroupFrame = []; 
		var columnFrame = [];
		groupZero.colgroup = colgroupFrame;
		
		var uidElem = 0;
		
		var currentRowLevel = 0;
		var currentRowPos = 0;
		var spannedRow = [];
		var tableCellWidth = 0;
		
		var headerRowGroupCompleted = false;
		var summaryRowGroupEligible = false;
		var rowgroupLevel = 1; // Default RowGroupLevel
		var currentRowHeader = [];

		if(!groupZero.rowgroup){
			groupZero.rowgroup = [];
		}
		
		if(!groupZero.lstrowgroup){
			groupZero.lstrowgroup = [];
		}
		
		var currentTbodyID = undefined;
		var pastTbodyID = undefined;
		
		
		
		var theadRowStack = [];
		var stackRowHeader = false;
		
		groupZero.elem = obj;
		groupZero.uid = uidElem; uidElem++; // Set the uid for the groupZero
		
		groupZero.colcaption = {}; // Group Cell Header at level 0, scope=col
		groupZero.colcaption.uid = uidElem; uidElem++;
		groupZero.colcaption.elem = undefined;
		groupZero.colcaption.type = 7;
		groupZero.colcaption.dataset = [];
		groupZero.colcaption.summaryset = [];

		groupZero.rowcaption = {}; // Group Cell Header at level 0, scope=row
		groupZero.rowcaption.uid = uidElem; uidElem++;
		groupZero.rowcaption.elem = undefined;
		groupZero.rowcaption.type = 7;
		groupZero.rowcaption.dataset = [];
		groupZero.rowcaption.summaryset = [];

		
		// Row Group Variable
		var rowgroupHeaderRowStack = [];
		var currentRowGroup = undefined;
		var currentRowGroupElement = undefined;
		var lstRowGroup = [];
		
		
		function processCaption(elem){
			
			groupZero.colcaption.elem = elem;
			groupZero.rowcaption.elem = elem;
			
			var groupheadercell = {
				colcaption: groupZero.colcaption,
				rowcaption: groupZero.rowcaption,
				elem: elem
			};
			groupheadercell.groupZero = groupZero;
			groupheadercell.type = 1;
			
			
			$(elem).data().tblparser = groupheadercell;
			
		}
		
		function processColgroup(elem){
			
			var colgroup = {
				elem: {},
				start: 0,
				end: 0,
				col: [],
				groupZero: groupZero
			}
			colgroup.elem = elem;
			
			$(elem).data().tblparser = colgroup;
			
			
			colgroup.uid = uidElem;
			uidElem++;
			groupZero.allParserObj.push(colgroup);
			

			if(colgroupFrame.length != 0){
				colgroup.start = colgroupFrame[colgroupFrame.length -1].end + 1;
			} else {
				colgroup.start = 1;
			}

			var colgroupspan = 0;
	
			// Add any exist structural col element
			$('col', elem).each(function(){
				var width = $(this).attr('span') != undefined ? parseInt($(this).attr('span')) : 1;
				
				var col = {
					elem: {},
					start: 0,
					end: 0,
					groupZero: groupZero
				};

				col.uid = uidElem;
				uidElem++;
				groupZero.allParserObj.push(col);
				
				col.start = colgroup.start + colgroupspan;
				col.end = colgroup.start + colgroupspan + width - 1; // Minus one because the default value was already calculated
				col.elem = this;
				
				col.groupZero = groupZero;
				
				$(this).data().tblparser = col;
				
				colgroup.col.push(col);
				columnFrame.push(col);
				
				colgroupspan += width;
			});
	
			// If no col element check for the span attribute
			if(colgroup.col.length == 0){
				var width = $(elem).attr('span') != undefined ? parseInt($(elem).attr('span')) : 1;
				colgroupspan += width;
				
				// Create virtual column 
				for(i= colgroup.start; i< (colgroup.start + colgroupspan); i++){
					var col = {
						start: 0,
						end: 0,
						groupZero: groupZero,
						elem: undefined
					};
					col.uid = uidElem;
					uidElem++;
					groupZero.allParserObj.push(col);
					
					col.start = i;
					col.end = i;
					
					colgroup.col.push(col);
					columnFrame.push(col);
					
				}
			}
			
			
			colgroup.end = colgroup.start + colgroupspan - 1;
	
			colgroupFrame.push(colgroup);
		}
		
		function processRowgroupHeader(colgroupHeaderColEnd){ // thead row group processing
			
			
			if(colgroupHeaderColEnd && colgroupHeaderColEnd > 0){
				// The first colgroup must match the colgroupHeaderColEnd
				if(colgroupFrame.length > 0 && (colgroupFrame[0].start != 1 || (colgroupFrame[0].end != colgroupHeaderColEnd && colgroupFrame[0].end != (colgroupHeaderColEnd + 1)))){
					errorTrigger('The first colgroup must be spanned either ' + colgroupHeaderColEnd + ' or ' + (colgroupHeaderColEnd + 1));
					
					// Destroy any existing colgroup, because they are not valid
					colgroupFrame = [];
				} 
				
				
			} else {
				colgroupHeaderColEnd = 0; // This mean that are no colgroup designated to be a colgroup header
			}
			
			// Associate any descriptive cell to his top header
			for(i=0; i<theadRowStack.length; i++){
				
				if(!theadRowStack[i].type){
					theadRowStack[i].type = 1;
				}
				
				for(j=0; j<theadRowStack[i].cell.length; j++){
					theadRowStack[i].cell[j].scope = "col";
										
					// check if we have a layout cell at the top, left
					if(i==0 && j==0 && $(theadRowStack[i].cell[j].elem).html().length == 0){
						// That is a layout cell
						theadRowStack[i].cell[j].type = 6; // Layout cell
						if(!groupZero.layoutCell){
							groupZero.layoutCell = [];
						}
						groupZero.layoutCell.push(theadRowStack[i].cell[j]);
						
						j= theadRowStack[i].cell[j].width -1;
						if(j>=theadRowStack[i].cell.length){
							break;
						}

					}

					// Check the next row to see if they have a corresponding description cell					
					if(!theadRowStack[i].cell[j].descCell && 
						theadRowStack[i].cell[j].elem.nodeName.toLowerCase() == 'th' && 
						!theadRowStack[i].cell[j].type && 
						theadRowStack[i+1] && 
						theadRowStack[i+1].uid != theadRowStack[i].cell[j].uid && 
						!theadRowStack[i+1].cell[j].type &&
						theadRowStack[i+1].cell[j].elem.nodeName.toLowerCase() == 'td' && 
						theadRowStack[i+1].cell[j].width == theadRowStack[i].cell[j].width &&
						theadRowStack[i+1].cell[j].height == 1){
						
						theadRowStack[i+1].type = 5; // Mark the next row as a row description
						theadRowStack[i+1].cell[j].type = 5; // Mark the cell as a cell description
						theadRowStack[i+1].cell[j].row = theadRowStack[i+1];
						
						theadRowStack[i].cell[j].descCell = theadRowStack[i+1].cell[j];
						
						// Add the description cell to the complete listing
						if(!groupZero.desccell){
							groupZero.desccell = [];
						}
						groupZero.desccell.push(theadRowStack[i+1].cell[j]);
						
						j= theadRowStack[i].cell[j].width -1;
						if(j>=theadRowStack[i].cell.length){
							break;
						}
						
					}
					
					if(!theadRowStack[i].cell[j].type){
						theadRowStack[i].cell[j].type = 1;
					}
				
				}
			}
			
			// Clean the theadRowStack by removing any descriptive row
			var tmpStack = [];
			for(i=0; i<theadRowStack.length; i++){
				
				if(theadRowStack[i].type == 5) {
				
					// Check if all the cell in it are set to the type 5
					for(j=0; j<theadRowStack[i].cell.length; j++){
						if(theadRowStack[i].cell[j].type != 5 && theadRowStack[i].cell[j].height == 1){
							errorTrigger(' You have an invalid cell inside a row description', theadRowStack[i].cell[j].elem);
						}
						

						// Check the row before and modify their height value
						if(theadRowStack[i].cell[j].uid == theadRowStack[i - 1].cell[j].uid){
							theadRowStack[i].cell[j].height --;
							
						}
						
					}
					groupZero.nbDescriptionRow ++;
					
				
				} else {
					tmpStack.push(theadRowStack[i]);
				}
				
			}
			
			
			groupZero.colgrp = []; // Array based on level as indexes for columns and group headers
			
			
			// Parser any cell in the colgroup header
			if(colgroupHeaderColEnd >0 && colgroupFrame.length == 1 || colgroupFrame.length == 0){
				// There are no colgroup element defined, All the cell will be considerated to be a data cell
				
				// Data Colgroup
				var dataColgroup = {};
				var dataColumns = [];
				var colgroup = {
					start: (colgroupHeaderColEnd +1),
					end: tableCellWidth,
					col: [],
					groupZero: groupZero,
					elem: undefined,
					type: 2 // Set colgroup data type
				}
				colgroup.uid = uidElem;
				uidElem++;
				groupZero.allParserObj.push(colgroup);
				
				if(colgroup.start > colgroup.end){
					errorTrigger('You need at least one data colgroup, review your table structure');
				}
				
				dataColgroup = colgroup;

				
				// Create the column
				// Create virtual column 
				for(i= colgroup.start; i<= colgroup.end; i++){
					var col = {
						start: 0,
						end: 0,
						groupZero: groupZero,
						elem: undefined
					}
					col.uid = uidElem;
					uidElem++;
					groupZero.allParserObj.push(col);
					
					if(!groupZero.col){
						groupZero.col = [];
					}
					dataColumns.push(col);
					
					col.start = i;
					col.end = i;
					col.groupstruct = colgroup;
					
					colgroup.col.push(col);
					columnFrame.push(col); // Check to remove "columnFrame"
					
				}
				
				// Default Level => 1
				
				groupZero.colgrp[1] = [];
				groupZero.colgrp[1].push(groupZero.colcaption);
				
				
				// Header Colgroup
				if(colgroupHeaderColEnd >0){
					var hcolgroup = {
						start: 1,
						elem: undefined,
						end: colgroupHeaderColEnd,
						col: [],
						groupZero: groupZero,
						type: 1 // Set colgroup data type
					}
					hcolgroup.uid = uidElem;
					uidElem++;
					groupZero.allParserObj.push(hcolgroup);
					
					colgroupFrame.push(hcolgroup);
					colgroupFrame.push(dataColgroup);
					groupZero.colcaption.dataset = dataColgroup.col;
					
					// Create the column
					// Create virtual column 
					for(i= hcolgroup.start; i<= hcolgroup.end; i++){
						var col = {
							start: 0,
							end: 0,
							groupZero: groupZero,
							elem: undefined
						}
						col.uid = uidElem;
						uidElem++;
						groupZero.allParserObj.push(col);
						
						if(!groupZero.col){
							groupZero.col = [];
						}
						groupZero.col.push(col);
						
						
						col.start = i;
						col.end = i;
						col.groupstruct = hcolgroup;
						
						hcolgroup.col.push(col);
						columnFrame.push(col);
						
					}
					
					for(i=0; i< dataColumns.length; i++){
						groupZero.col.push(dataColumns[i]);
					}

					
				}
				
				if(colgroupFrame.length == 0){
					colgroupFrame.push(dataColgroup);
					groupZero.colcaption.dataset = dataColgroup.col;
				}
				
				// Set the header for each column
				for(i=0; i<groupZero.col.length; i++){
					groupZero.col[i].header = [];
					for(j=0; j<tmpStack.length; j++){
						for(m=groupZero.col[i].start; m<= groupZero.col[i].end; m++){
							groupZero.col[i].header.push(tmpStack[j].cell[m]);
						}
					}
				}
				
				
			} else {
				// They exist colgroup element, 
				
	
				//
				// -----------------------------------------------------
				//
				// Build data column group based on the data column group and summary column group.
				//
				// Suggestion: In the future, may be allow the use of a HTML5 data or CSS Option to force a colgroup to be a data group instead of a summary group
				//
				// -----------------------------------------------------
				//
				
				
				
				var lstRealColgroup = []; // List of real colgroup

				var currColPos = (colgroupHeaderColEnd == 0 ? 1 : colgroupFrame[0].end +1); // Set the current column position
				
				var colgroup = {
					start: currColPos, 
					end: undefined,
					col: [],
					row: [],
					type: 2 // Set colgroup data type, that is the initial colgroup type
				}
				
				var currColgroupStructure = [];
				
				var colFrmId = 0;
				

				var bigTotalColgroupFound = false;
				
				$.each(colgroupFrame, function(){
					var curColgroupFrame = this;
				
					
					
					colFrmId++;
					
					if(bigTotalColgroupFound || groupZero.colgrp[0]){
						errorTrigger("The Lowest column group have been found, You may have an error in you column structure", curColgroupFrame);
						return;
					}
					
					
					$.each(curColgroupFrame.col, function(){
						var column = this;
						if(!groupZero.col){
							groupZero.col = [];
						}
						groupZero.col.push(column);
					
						column.type = 1;
						column.groupstruct = curColgroupFrame;
					});
					
					if(curColgroupFrame.start < currColPos){
						if(colgroupHeaderColEnd != curColgroupFrame.end){
							errorTrigger("The initial colgroup should group all the header, there are no place for any data cell", curColgroupFrame);
						}
						
						// Skip this colgroup, this should happend only once and should represent the header colgroup
						return;
					}
					
					var groupLevel = undefined;
					
					// Get the colgroup level
					for(i =0; i<tmpStack.length; i++){
						
						if((tmpStack[i].cell[curColgroupFrame.end -1].colpos + tmpStack[i].cell[curColgroupFrame.end -1].width- 1) == curColgroupFrame.end && (tmpStack[i].cell[curColgroupFrame.end -1].colpos >= curColgroupFrame.start )){
							if(!groupLevel || groupLevel > (i+1)){
								groupLevel =  (i+1) // would equal at the current data cell level. The lowest row level win
							}
						}
					}
					
					
					
					if(!groupLevel){
						errorTrigger("Imposible to find the colgroup level, Check you colgroup definition or/and your table structure"); // That happend if we don't able to find an ending cell at the ending colgroup position.
					}
					
					
					// All the cells at higher level (Bellow the group level found) of witch one found, need to be inside the colgroup
					for(i =(groupLevel-1); i<tmpStack.length; i++){
					
						// Test each cell in that group
						for(j = curColgroupFrame.start -1; j < curColgroupFrame.end; j++){
							
							if(tmpStack[i].cell[j].colpos < 
								curColgroupFrame.start || 
								(tmpStack[i].cell[j].colpos + tmpStack[i].cell[j].width -1) > 
								curColgroupFrame.end){
								
								errorTrigger("Error in you header row group, there are cell that are crossing more than one colgroup under the level:" + groupLevel);
								return;
							}
						
						}
					}
					
					

					// Add virtual colgroup Based on the top header
					for(i = currColgroupStructure.length; i < (groupLevel-1); i++){
						
						// Use the top cell at level minus 1, that cell must be larger 
						if(tmpStack[i].cell[curColgroupFrame.start-1].uid != tmpStack[i].cell[curColgroupFrame.end-1].uid || 
							tmpStack[i].cell[curColgroupFrame.start-1].colpos > curColgroupFrame.start || 
							tmpStack[i].cell[curColgroupFrame.start-1].colpos + tmpStack[i].cell[curColgroupFrame.start-1].width -1 < curColgroupFrame.end){
							
							errorTrigger("The cell used to represent the data at level :" + (groupLevel -1) + " must encapsulate his group and be the same");
							return;
						}
					

						
						// Convert the header in a group header cell
						
						
						var cgrp = tmpStack[i].cell[curColgroupFrame.start-1]
						
						cgrp.level = (i+1);
						
						cgrp.start = cgrp.colpos;
						cgrp.end = cgrp.colpos + cgrp.width -1;
						
						
						cgrp.type = 7; // Group Header Cell
						
						currColgroupStructure.push(cgrp);
						
						if(!groupZero.virtualColgroup){
							groupZero.virtualColgroup =  []
						}
						groupZero.virtualColgroup.push(cgrp);
						
						// Add the group into the level colgroup perspective
						if(!groupZero.colgrp[(i+1)]){
							groupZero.colgrp[(i+1)] = [];
						}
						groupZero.colgrp[(i+1)].push(cgrp);
						
					}
					
					
					// Set the header list for the current group
					curColgroupFrame.header = [];
					for(i = groupLevel- (groupLevel >=2? 2:1); i<tmpStack.length; i++){
						
						for(j=curColgroupFrame.start; j<=curColgroupFrame.end; j++){
							
							if(tmpStack[i].cell[j-1].rowpos == i+1){
								
								curColgroupFrame.header.push(tmpStack[i].cell[j-1]);
								// Attach the current colgroup to this header
								tmpStack[i].cell[j-1].colgroup = curColgroupFrame;
							}
							j += tmpStack[i].cell[j-1].width -1;
						}
						
					}
					
					// Assign the parent header to the current header
					var parentHeader = [];
					for(i=0; i<currColgroupStructure.length-1; i++){
						parentHeader.push(currColgroupStructure[i]);
					}
					curColgroupFrame.parentHeader = parentHeader;
					
					// Check to set if this group are a data group
					if(currColgroupStructure.length < groupLevel){
						// This colgroup are a data colgroup
						// The current colgroup are a data colgroup
						
						
						if(!curColgroupFrame.type){ // TODO: Remove this condition when this function will be called only once
							curColgroupFrame.type = 2; // Set Data group type
							curColgroupFrame.level = groupLevel;
						}
						
						currColgroupStructure.push(curColgroupFrame);
						
						// Add the group into the level colgroup perspective
						if(!groupZero.colgrp[groupLevel]){
							groupZero.colgrp[groupLevel] = [];
						}
						groupZero.colgrp[groupLevel].push(curColgroupFrame);
						
					}
					
					
					
					//
					// Preparing the current stack for the next colgroup and set if the current are a summary group
					//
					
					// Check if we need to pop out the current header colgroup 
					var summaryAttached = false;
					for(i=currColgroupStructure.length-1; i >= 0 ; i--){
						
						if(currColgroupStructure[i].end <= curColgroupFrame.end){
							
							if(currColgroupStructure[i].level < groupLevel){
								curColgroupFrame.type = 3;
							}
							
							// Attach the Summary group to the colgroup poped if current colgroup are type 3
							if(curColgroupFrame.type == 3 && !summaryAttached){
								currColgroupStructure[currColgroupStructure.length-1].summary = curColgroupFrame;
								summaryAttached = true; // This are used to do not attach a summary of level 4 to an inapropriate level 1 for exampled
							}

							currColgroupStructure.pop();

						}
						
					
					}
					

					
					// Catch the second and the third possible grouping at level 1
					if(groupLevel == 1 && groupZero.colgrp[1] && groupZero.colgrp[1].length > 1){
						
						// Check if in the group at level 1 if we don't already have a summary colgroup
						for(i=0; i<groupZero.colgrp[1].length; i++){
							if(groupZero.colgrp[1][i].type == 3){
								// Congrat, we found the last possible colgroup, 
								curColgroupFrame.level = 0;
								if(!groupZero.colgrp[0]){
									groupZero.colgrp[0] = [];
								}
								groupZero.colgrp[0].push(curColgroupFrame);
								groupZero.colgrp[1].pop();
								
								bigTotalColgroupFound = true;
								break;
							}
						}
						
						curColgroupFrame.type = 3;
					}
					
					
					// Set the representative header "caption" element for a group at level 0
					if(curColgroupFrame.level== 1 && curColgroupFrame.type == 2){
						curColgroupFrame.repheader = 'caption';
					}
					

					// TODO: Build a collection with all the column based on the column position, each of them will have as a structure element "col" if available, otherwise nothing. Also they will have the headerset ref and header ref and if applicable, description.
					if(!groupZero.col){
						groupZero.col = [];
					}
					
					$.each(curColgroupFrame.col, function(){
						
						var column = this;
						
						column.type = curColgroupFrame.type;
						column.level = curColgroupFrame.level;
						column.groupstruct = curColgroupFrame;
						
						
						
						column.header = [];
						// Find the lowest header that would represent this column
						for(j= (tmpStack.length -1); j >= (groupLevel -1); j-- ){
							
							for(i =(curColgroupFrame.start -1); i< curColgroupFrame.end; i++){
							
							
								if(tmpStack[j].cell[i].colpos >= column.start && 
									tmpStack[j].cell[i].colpos <= column.end || 
									
									tmpStack[j].cell[i].colpos <= column.start &&
									(tmpStack[j].cell[i].colpos + tmpStack[j].cell[i].width -1) >= column.end ||
									
									(tmpStack[j].cell[i].colpos + tmpStack[j].cell[i].width -1) <= column.start && 
									(tmpStack[j].cell[i].colpos + tmpStack[j].cell[i].width -1) >= column.end ){
										
									if(column.header.length == 0 || 
										column.header.length > 0 && column.header[column.header.length - 1].uid != tmpStack[j].cell[i].uid){
										// This are the header that would represent this column
										column.header.push(tmpStack[j].cell[i]);
										tmpStack[j].cell[i].level = curColgroupFrame.level;
									}
								}
							}
						}
					});
					
				});
				
				if(!groupZero.virtualColgroup){
					groupZero.virtualColgroup = [];
				}
				// Set the Virtual Group Header Cell, if any
				$.each(groupZero.virtualColgroup, function(){
					var vGroupHeaderCell = this;
					
						// Set the headerLevel at the appropriate column
						for(i=(vGroupHeaderCell.start-1); i< vGroupHeaderCell.end; i++){
							if(!groupZero.col[i].headerLevel){
								groupZero.col[i].headerLevel = [];
							}
							groupZero.col[i].headerLevel.push(vGroupHeaderCell);
						}
				});
				
				
			}
			
			// Associate the colgroup Header in the group Zero
			if(colgroupFrame.length > 0 && colgroupHeaderColEnd > 0){
				groupZero.colgrouphead = colgroupFrame[0];
				groupZero.colgrouphead.type = 1; // Set the first colgroup type :-)
			}

			
		}
		
		

		function finalizeRowGroup(){
			
			// If the current row group are a data group, check each row if we can found a pattern about to increment the data level for this row group
			// Update, if needed, each row and cell to take in consideration the new row group level
			// Add the row group in the groupZero Collection
			
			currentRowGroupElement
		}
		
		function initiateRowGroup(){
			// Finalisation of any exisiting row group
			// Initialisation of the a new row group 
			
			currentRowGroup = {
				elem: currentRowGroupElement,
				row: [],
				headerlevel: [],
				type: 2 // (1 if elem is a thead or if detected in the table, 2 default, 3 if summary data) 
			};
		}
		
		function rowgroupSetup(){
			// check if there any cell in the rowgroupHeaderRowStack Array
			
			// if more than 0 cell in the stack, mark this row group as a data row group and create the new row group (can be only virtual)
			
			// if no cell in the stack but first row group, mark this row group as a data row group
			
			// if no cell in the stack and not the first row group, this are a summary group
			
			// Calculate the appropriate row group level based on the previous rowgroup 
			//	* a Summary Group decrease the row group level
			//	* a Data Group increase the row group level based of his number of row group header and the previous row group level
		
		}
		
		
		function processRow(elem){
			
			// TODO: Remove the possible confusion about the colgroup name used in the row processing but keep his functionality because that fix the grouping if no header cell are present.
			
			
			currentRowPos ++;
			var columnPos = 1;
			var lastCellType = "";
			var lastHeadingColPos = false;
		
			var cells = $(elem).children();

			var row = {
				colgroup: [], // == Build from colgroup object ==

				cell: [], // == Build from Cell Object ==

				elem: elem, // Row Structure jQuery element
				
				rowpos: currentRowPos
			};
			
			$(elem).data().tblparser = row;
			
			row.uid = uidElem;
			uidElem++;
			groupZero.allParserObj.push(row);
			
			var colgroup = {
				cell: [],
				cgsummary: undefined, // ?? Not sure because this will be better in the data colgroup object ?? Summary Colgroup Associated
				type: false // 1 == header, 2 == data, 3 == summary, 4 == key, 5 == description, 6 == layout, 7 == group header
			}

			colgroup.uid = uidElem;
			uidElem++;
			groupZero.allParserObj.push(colgroup);
			
			
			var isRowHeadingFound = false;
			
			var fnPreProcessGroupHeaderCell = function(headerCell){
				if(!colgroup.type){
					colgroup.type = 1;
				}
				if(colgroup.type != 1){
					// Creation of a new colgroup
					row.colgroup.push(colgroup); // Add the previous colgroup
					
					// Create a new colgroup
					colgroup = {
						cell: [],
						type: 1
					};
					colgroup.uid = uidElem;
					uidElem++;
					groupZero.allParserObj.push(colgroup);
				}
				colgroup.cell.push(headerCell);
				
				lastHeadingColPos = headerCell.colpos + headerCell.width - 1;
				
			}
			
			var fnPreProcessGroupDataCell = function(dataCell){
				if(!colgroup.type){
					colgroup.type = 2;
				}
				
				// TODO: Check if we need to create a summary colgroup (Based on the top colgroup definition)
				
				if(colgroup.type != 2){
					// Creation of a new colgroup
					row.colgroup.push(colgroup); // Add the previous colgroup
					
					// Create a new colgroup
					colgroup = {
						cell: [],
						type: 2
					};
					colgroup.uid = uidElem;
					uidElem++;
					groupZero.allParserObj.push(colgroup);
				}

				colgroup.cell.push(dataCell);
			}
			
			
			var fnParseSpannedRowCell = function(){
				// Check for spanned row
				$.each(spannedRow, function(){

					if(this.colpos == columnPos && this.spanHeight > 0 && (this.height + this.rowpos - this.spanHeight == currentRowPos)){

						
						
						if(this.elem.nodeName.toLowerCase() == 'th'){
							fnPreProcessGroupHeaderCell(this);
						}
						
						if(this.elem.nodeName.toLowerCase() == 'td'){
							fnPreProcessGroupDataCell(this);
						}
						
						this.spanHeight --;
						
						// Increment the column position
						columnPos += this.width;
						
						// Add the column
						for(i=1; i<=this.width; i++){
							row.cell.push(this);
						}

						
						
						lastCellType = this.elem.nodeName.toLowerCase();
						
						
					}
				});
			};
			fnParseSpannedRowCell(); // This are for any row that have spanned row in is first cells
			
			// Read the row
			$.each(cells, function(){
				
				
				var width = $(this).attr('colspan') != undefined ? parseInt($(this).attr('colspan')) : 1,
					height = $(this).attr('rowspan') != undefined ? parseInt($(this).attr('rowspan')) : 1;
				
				switch (this.nodeName.toLowerCase()){
					case 'th': // cell header
						
						var headerCell = {
							rowpos: currentRowPos,
							colpos: columnPos,
							width: width,
							height: height,
							data: [],
							summary: [],
							elem: this,
						};
						
						$(this).data().tblparser = headerCell;
						headerCell.groupZero = groupZero;
						
						headerCell.uid = uidElem;
						uidElem++;
						groupZero.allParserObj.push(headerCell);
						
						fnPreProcessGroupHeaderCell(headerCell);

						headerCell.parent = colgroup;
						
						// Check if needs to be added to the spannedRow collection
						if(height > 1){
							headerCell.spanHeight = height - 1;
							spannedRow.push(headerCell);
						}
						
						// Increment the column position
						columnPos += headerCell.width;

						for(i=1; i<=width; i++){
							row.cell.push(headerCell);
						}
						
						// Check for any spanned cell
						fnParseSpannedRowCell(); 
						
						break;
					case 'td': // data cell
					
						var dataCell = {
							rowpos: currentRowPos,
							colpos: columnPos,
							width: width,
							height: height,
							elem: this
						};
						
						$(this).data().tblparser = dataCell;
						dataCell.groupZero = groupZero;
						
						dataCell.uid = uidElem;
						uidElem++;
						groupZero.allParserObj.push(dataCell);
						
						fnPreProcessGroupDataCell(dataCell);

						dataCell.parent = colgroup;

						// Check if needs to be added to the spannedRow collection
						if(height > 1){
							dataCell.spanHeight = height - 1;
							spannedRow.push(dataCell);
						}
						
						// Increment the column position
						columnPos += dataCell.width;
						
						for(i=1; i<=width; i++){
							row.cell.push(dataCell);
						}
						
						// Check for any spanned cell
						fnParseSpannedRowCell();
						break;
					default:
						errorTrigger('tr element need to only have th or td element as his child', this);
						break;
				}
				
				lastCellType = this.nodeName.toLowerCase();
				
			});
			
			// Check for any spanned cell
			fnParseSpannedRowCell();
			
			// Check if this the number of column for this row are equal to the other
			if(tableCellWidth == 0){
				// If not already set, we use the first row as a guideline
				tableCellWidth = row.cell.length;
			}
			if(tableCellWidth != row.cell.length){
				row.spannedRow = spannedRow;
				errorTrigger('The row do not have a good width', row.elem);
			}
			
			// Check if we are into a thead rowgroup, if yes we stop here.
			if(stackRowHeader){
				theadRowStack.push(row);
				return;
			}
			
			
			// Add the last colgroup
			row.colgroup.push(colgroup);
			
			
			
			
			//
			// Diggest the row
			//
			
			if(lastCellType == 'th'){
				// Digest the row header
				row.type = 1;
				
				
				//
				// Check the validity of this header row
				//

				if(row.colgroup.length == 2 && currentRowPos == 1){
					// Check if the first is a data colgroup with only one cell 
					if(row.colgroup[0].type == 2 && row.colgroup[0].cell.length == 1){
						// Valid row header for the row group header
						
						// REQUIRED: That cell need to be empty
						if($(row.colgroup[0].cell[0].elem).html().length == 0){
							// console.log('This is a valide row for the rowgroup header with a layout cell');
							
							// We stack the row
							theadRowStack.push(row);
							
							return; // We do not go further
							
						} else {
							errorTrigger('ERROR: Seems to be an row in the row group header, but the layout cell are not empty');
						}
					} else {
						// Invalid row header
						errorTrigger('This is an INVALID row header and CAN NOT be Assigned to the rowgroup header');
					}
				} 
				
				if(row.colgroup.length == 1){
					
					
					if(row.colgroup[0].cell.length > 1){
						// this is a row associated to a header row group

						if(!headerRowGroupCompleted){
							// Good row
							// console.log('This is an valid row header for the header row group');
							
							// We stack the row
							theadRowStack.push(row);
							
							return; // We do not go further
							
							
						} else {
							// Bad row, remove the row or split the table
							errorTrigger('This is an INVALID row header for the header row group, split the table or remove the row');
						}
					} else {
						if(currentRowPos != 1){
							
							// Stack the row found for the rowgroup header
							rowgroupHeaderRowStack.push(row);
							
							// This will be processed on the first data row 
							
							// console.log('this header row will be considerated to be a rowgroup header row');
							headerRowGroupCompleted = true; // End of any header row group (thead)
							
							return;
						} else {
							errorTrigger('You can not set a header row for a rowgroup in the first table row');
						}
					}
				}
				
				if(row.colgroup.length > 1  && currentRowPos != 1){
					errorTrigger('This is an invalid row header because they can not mix data cell with header cell');
				}
				
				//
				// If Valid, process the row
				//
				
			} else {
				// Digest the data row
				row.type = 2;
				
				
				
				// This mark the end of any row group header (thead)
				headerRowGroupCompleted = true;
				
				
				//
				// 
				// TODO: Process any row used to defined the rowgroup label
				//
				//
				
				if(rowgroupHeaderRowStack.length > 0 && currentRowHeader.length == 0){
					// TODO: check if the current stack of the current rowgroup need to have 0 datarow inside
					// Set the number of level for this group, also this group will be a data rowgroup
					

					// we start at the level 1 for the first heading
					
					// Calculate the starting row level by using preceding row level
					
					var iniRowGroupLevel = (groupZero.lstrowgroup.length > 1? (rowgroupHeaderRowStack.length - groupZero.lstrowgroup[groupZero.lstrowgroup -1].level): 1) -1;

				
					// Create virtual rowgroup
					for(i=iniRowGroupLevel; i<(rowgroupHeaderRowStack.length-1); i++){
						
						var grpRowHeader = {
							groupZero: groupZero,
							header: [],
							level: (i+1)
						};
						
						grpRowHeader.uid = uidElem;
						uidElem++;
						groupZero.allParserObj.push(grpRowHeader);	
						
						grpRowHeader.elem = rowgroupHeaderRowStack[i].row.cell[0].elem;
						grpRowHeader.struct = rowgroupHeaderRowStack[i].row.elem;
						
						rowgroupHeaderRowStack[i].row.cell[0].scope = "row";
						rowgroupHeaderRowStack[i].row.cell[0].level = (i+1);
						
						
						rowgroupHeaderRowStack[i].row.type = 1;
						
						currentRowHeader.push(grpRowHeader);
						
						// Include this virtual row group in the current one
					}
					
					// Set the level for the current rowgroup

					rowgroupHeaderRowStack[rowgroupHeaderRowStack.length-1].cell[0].scope = "row";
					rowgroupHeaderRowStack[rowgroupHeaderRowStack.length-1].cell[0].level = rowgroupHeaderRowStack.length;
					rowgroupHeaderRowStack[rowgroupHeaderRowStack.length-1].type = 1;
					
					currentRowHeader.push(rowgroupHeaderRowStack[rowgroupHeaderRowStack.length-1].cell[0]);		

					pastTbodyID	= currentTbodyID;
				}
				
				
				if(currentTbodyID != pastTbodyID){
					row.type = 3;
					
					currentRowHeader = groupZero.row[groupZero.row.length-1].levelheader;
					
				}
				// We have a summary row group
					
				row.levelheader = currentRowHeader;
				row.level = (currentRowHeader.length > 0?currentRowHeader[currentRowHeader.length -1].level:0);
				
				
				
				
				// Adjust if required, the lastHeadingColPos if colgroup are present, that would be the first colgroup
				if(colgroupFrame[0] && lastHeadingColPos && !(colgroupFrame[0].end == lastHeadingColPos)){
					if(colgroupFrame[0].end == (lastHeadingColPos + 1)){
						lastHeadingColPos ++;
					} else {
						// The colgroup are not representating the table structure
						errorTrigger('The first colgroup need to be used as an header colgroup', colgroupFrame[0].elem);
					}
				}
				row.lastHeadingColPos = lastHeadingColPos;
				
				
				// Build the initial colgroup structure
				// If an cell header exist in that row....
				
				
				if(lastHeadingColPos){
					// Process the heading colgroup associated to this row.
					
					
					var headingRowCell = [];
					
					
					var rowheader = undefined; // This are the most precise cell header for this row
					
					var colKeyCell = [];
					
					for(i=0; i<lastHeadingColPos; i++){
						
						
						// Check for description cell or key cell
						if(row.cell[i].elem.nodeName.toLowerCase() == "td"){
							
							if(!row.cell[i].type && row.cell[i-1] && !(row.cell[i-1].descCell) && row.cell[i-1].type == 1 && row.cell[i-1].height == row.cell[i].height){
								row.cell[i].type = 5;
								
								row.cell[i-1].descCell = row.cell[i];
								
								if(!row.desccell){row.desccell = [];}
								row.desccell.push(row.cell[i]);
								
								if(!groupZero.desccell){groupZero.desccell = [];}
								groupZero.desccell.push(row.cell[i]);
								
								row.cell[i].scope = "row"; // Specify the scope of this description cell
								

							}
							
							// Check if this cell can be an key cell associated to an cell heading
							if(!row.cell[i].type){
								colKeyCell.push(row.cell[i]);
							}
							
						}
						
						
						// Set for the most appropriate header that can represent this row
						if(row.cell[i].elem.nodeName.toLowerCase() == "th"){
							row.cell[i].type = 1; // Mark the cell to be an header cell
							row.cell[i].scope = "row";
							if(rowheader && rowheader.uid != row.cell[i].uid){
								if(rowheader.height > row.cell[i].height){
									
									// The current cell are a child of the previous rowheader 
									if(!rowheader.subheader){
										rowheader.subheader = [];
										rowheader.isgroup = true;
									}
									rowheader.subheader.push(row.cell[i]);
									
									// Change the current row header
									rowheader = row.cell[i];
									headingRowCell.push(row.cell[i]);

								} else {
									// This case are either paralel heading of growing header, this are an error.
									if(rowheader.height == row.cell[i].height){
										errorTrigger('You can not have paralel row heading, do a cell merge to fix this');
									} else {
										errorTrigger('For a data row, the heading hiearchy need to be the Generic to the specific');
									}
								}
							} 
							if(!rowheader){
								rowheader = row.cell[i];
								headingRowCell.push(row.cell[i]);
							}
							
							$.each(colKeyCell, function(){
								if(!(this.type) && !(row.cell[i].keycell) && this.height == row.cell[i].height){
									this.type = 4;
									row.cell[i].keycell = this;
									
									if(!row.keycell){row.keycell = [];}
									row.keycell.push(this);
									
									if(!groupZero.keycell){groupZero.keycell = [];}
									groupZero.keycell.push(this);
								}
							});
							
							
						}
					}
					
					// All the cell that have no "type" in the colKeyCell collection are problematic cells;
					$.each(colKeyCell, function(){
						if(!(this.type)){
							errorTrigger('You have a problematic cell, in your colgroup heading, that can not be understood by the parser');
							if(!row.errorcell){row.errorcell = [];}
							row.errorcell.push(this);
						}
					});
					row.headerset = headingRowCell;
					row.header = rowheader;
					
				} else {
					// There are only at least one colgroup,
					// Any colgroup tag defined but be equal or greater than 0.
					// if colgroup tag defined, they are all data colgroup. 
					lastHeadingColPos = 0;
				}
				
				
				
				
				
				
				
				
				
				
				//
				// Process the table row heading and colgroup if required
				//
				if(colgroupFrame.length != 0){
					
					// We check the first colgroup to know if a colgroup type has been defined
					if(!(colgroupFrame[0].type)){
						
						processRowgroupHeader(lastHeadingColPos);
						
						// Match the already defined colgroup tag with the table rowgroup heading section
						
						// If the table don't have a rowgroup heading section and nothing found for colgroup heading, let all the colgroup to be a datagroup
						// If the table don't have a row group heading section but have a colgroup heading, the first group must match the founded colgroup heading, the second colgroup will be a datagroup and the third will be a summary colgroup. It would be the same if only one row are found in the rowgroup heading section.
					
					}
					
				} else {
					processRowgroupHeader(lastHeadingColPos);
					
					// If the table have a table rowgroup heading section, let that to be transformed into colgroup
					
					// The number of colgroup level are directly related to the number of row heading included in the thead or tbody.
					
					// If the table don't have a heading section, let run the code, the colgroup would be created later
				}
				
				if(lastHeadingColPos != 0){
					lastHeadingColPos = colgroupFrame[0].end; // colgroupFrame must be defined here
				}
				









				//
				// Associate the data cell type with the colgroup if any, 
				
				// Process the data cell. There are a need to have at least one data cell per data row.
				if(!row.datacell){
					row.datacell = [];
				}
				for(i=lastHeadingColPos; i<row.cell.length; i++){
					
					var isDataCell = true;
					var IsDataColgroupType = true; // TODO: Remove this variable
					
					for(j=(lastHeadingColPos == 0 ? 0 : 1); j<colgroupFrame.length; j++){ // If colgroup, the first are always header colgroup
						if(colgroupFrame[j].start <= row.cell[i].colpos && row.cell[i].colpos <= colgroupFrame[j].end){
						
							if(row.type == 3 || colgroupFrame[j].type == 3){
								row.cell[i].type = 3; // Summary Cell
							} else {
								row.cell[i].type = 2;
							}
							
							if(row.type == 3 && colgroupFrame[j].type == 3){
								// TODO: Test if this cell are a layout cell
							}
							
							row.cell[i].collevel = colgroupFrame[j].level;
							row.datacell.push(row.cell[i]);
							

						}
						
						IsDataColgroupType = !IsDataColgroupType;
					}
					
					if(colgroupFrame.length == 0){
						// There are no colgroup definition, this cell are set to be a datacell
						row.cell[i].type = 2;
						row.datacell.push(row.cell[i]);
					}
				
				}
				
				var createGenericColgroup = (colgroupFrame.length == 0?true:false);
				if(colgroupFrame.length == 0){
					
					// processRowgroupHeader(lastHeadingColPos);
					createGenericColgroup = false;
				}
				
				// Associate the row with the cell and Colgroup/Col association
				for(i=0; i<row.cell.length; i++){
					row.cell[i].row = row;
					
					row.cell[i].rowlevel = row.level;
					row.cell[i].rowlevelheader = currentRowHeader;
					

				}
				
				
				
				
				// Add the cell in his appropriate column
				
				if(!groupZero.col){
					groupZero.col = [];
				}
				
				for(i=0; i<groupZero.col.length; i++){
					
					for(j=(groupZero.col[i].start -1); j<groupZero.col[i].end; j++){
						
						if(!groupZero.col[i].cell){
							groupZero.col[i].cell = [];
						}
						// Be sure to do not include twice the same cell for a column spanned in 2 or more column
						if(!(j>(groupZero.col[i].start -1) && groupZero.col[i].cell[groupZero.col[i].cell.length -1].uid ==  row.cell[j].uid)){
							groupZero.col[i].cell.push(row.cell[j]);
							row.cell[j].col = groupZero.col[i];
						}
					}
										
				}
				
				
				
				summaryRowGroupEligible = true;
			}
			
			currentRowLevel ++;

			
			// Add the row to the groupZero
			if(!groupZero.row){
				groupZero.row = [];
			}
			groupZero.row.push(row);
			







delete row.colgroup;




		} // End processRow function
		
		
		//
		// Main Entry For The Table Parsing
		//
		
		
		$(obj).children().each(function(){
			switch (this.nodeName.toLowerCase()){
				case 'caption':groupZero
					processCaption(this);
					
					break;
				case 'colgroup':
					processColgroup(this);
					break;
					
				case 'thead':
					
					currentRowGroupElement = this;
					
					// The table should not have any row at this point
					if(theadRowStack.length != 0 || groupZero.row && groupZero.row.length > 0){
						errorTrigger('You can not define any row before the thead group', this);
					}
					
					$(this).data("tblparser", groupZero);
					
					stackRowHeader = true;
					
					// This is the rowgroup header, Colgroup type can not be defined here
					$(this).children().each(function(){
						if(this.nodeName.toLowerCase() != 'tr'){
							// ERROR
							errorTrigger('thead element need to only have tr element as his child', this);
						}
						
						processRow(this);
						
					});
					
					stackRowHeader = false;
					
					
					
					// Here it's not possible to  Diggest the thead and the colgroup because we need the first data row to be half processed before
					
					
					break;
				case 'tbody':
					
					currentRowGroupElement = this;
					
					/*
					*
					*
					*
					* First tbody = data
					* All tbody with header == data
					* Subsequent tbody without header == summary
					* 
					*/
					// $(this).data("tblparser", currentRowHeader);
					
					// New row group
					
					$(this).children().each(function(){
						if(this.nodeName.toLowerCase() != 'tr'){
							// ERROR
							errorTrigger('tbody element need to only have tr element as his child', this);
							return;
						}
						
						processRow(this);
						
					});
					
					
					// Check for residual rowspan, there can not have cell that overflow on two or more rowgroup
					$.each(spannedRow, function(){
						if(this.spanHeight > 0){
							// That row are spanned in 2 different row group
							errorTrigger('You can not span cell in 2 different rowgroup', this);
						}
					});
					
					spannedRow = []; // Cleanup of any spanned row
					
					rowgroupHeaderRowStack = []; // Remove any rowgroup header found.
					
					currentRowHeader = [];
					
					// TODO: Check for sub-rowgroup defined inside the actual row group, like col1 have row spanned in 4 row constantly...
					
					currentTbodyID ++;
					
					break;
				case 'tfoot':
					
					currentRowGroupElement = this;
					
					// The rowpos are not incremented here because this is a summary rowgroup for the GroupZero
					
					// TODO: Question: Stack any row and processed them at the really end ???
					
					break;
				case 'tr':
					// This are suppose to be a simple table
					
					processRow(this);
					
					break;
				default:
					// There is a DOM Structure error
					errorTrigger('Use the appropriate table markup', this);
					break;
			}
		});
		
		
		groupZero.theadRowStack = theadRowStack;
		
		
		delete groupZero.colgroupFrame;
		groupZero.colgrouplevel = groupZero.colgrp;
		delete groupZero.colgrp;
		
		
		} // end of exec
	};
	
	
	window.pe = _pe;
	return _pe;
}(jQuery));
