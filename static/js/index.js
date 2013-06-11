var out$ = typeof exports != 'undefined' && exports || this;

out$.aceEditEvent = function (hook_name, args, cb) { // on an edit

  if(args.callstack.type == "setWraps"){ // fired when wraps is fired
    setTimeout(function(){ // has to wait for a bit to do this..
      authorViewUpdate();
    }, 10);
  }

  if(!args.callstack.docTextChanged || (args.callstack.type != "applyChangesToBase")){ // has the document text changed?
//  if(!args.callstack.docTextChanged){ // has the document text changed?

  /*** Note
     If you uncomment the above line and comment out the line above it the authorcolors
     work properly but it slows down as it fires on idleWorkTimer events. 
  ***********/

    return false; 
  }else{
    authorViewUpdate();
  }

}

function authorViewUpdate(){
  var lineNumber = 0;
  var authors = {};

  // below can be slow, be mindful
  var divs = $('iframe[name="ace_outer"]').contents().find('iframe').contents().find("#innerdocbody").children("div"); // get each line
  $('iframe[name="ace_outer"]').contents().find('#sidediv').css({"padding-right":"0px"}); // no need for padding when we use borders
  $('iframe[name="ace_outer"]').contents().find('#sidedivinner').css({"max-width":"180px", "overflow":"hidden"}); // set max width to 180
  $('iframe[name="ace_outer"]').contents().find('#sidedivinner > div').css({"text-overflow":"ellipsis", "overflow":"hidden"}); // stop overflow and use ellipsis

  $(divs).each(function(){ // each line
    if($(this).text().length > 0){ // return nothign if the line is blank :)
      var authorClass = "";
      authors.line = {};
      authors.line.number = lineNumber;
      $(this).children("span").each(function(){ // each span
        var spanclass = $(this).attr("class");
        if(spanclass.indexOf("author") !== -1){ // if its an author span.
          var length = $(this).text().length; // the length of the span
          if(authors.line[spanclass]){
            authors.line[spanclass] = authors.line[spanclass] + length; // append the length to existing chars
          }else{
            authors.line[spanclass] = length; // set a first value of length
          }
        }
      }); // end each span
      
      // get the author with the most chars
      var mPA = 0; // mPA = most prolific author
      $.each(authors.line, function(index, value){ // each author of this div
        if(index != "number"){ // if its not the line number
          if ( value > mPA ){ // if the value of the number of chars is greater than the old char
            mPA = value; // Set the new baseline #
            authorClass = index; // set the line Author :)
            authors[lineNumber] = authorClass;
          }
        }
      });
    }

    // remove the primary authorColor underline
    $(this).children("span").each(function(){ // each span
      var spanclass = $(this).attr("class");
      if(spanclass.indexOf("author") !== -1){ // if its an author span.
        if(spanclass == authorClass){ // if the author span is the same as the same as the line primary author
          $(this).style("border-bottom", "0px solid #000", "important"); // removes border bottom // See Note!
        }
      }
    });
    
    var nth = lineNumber +1; // nth begins count at 1
    var prev = lineNumber -1; // previous item is always one less than current linenumber
    var $authorContainer = $('iframe[name="ace_outer"]').contents().find('#sidedivinner').find('div:nth-child('+nth+')'); // get the left side author contains
    if($(this).text().length == 0){ // if the line has no text
       $authorContainer.html(""); // line is blank, we should nuke the line number
       $authorContainer.css({"border-right":"solid 0px ", "padding-right":"5px"}); // add some blank padding to keep things neat
    }

    if(authorClass){ // If ther eis an authorclass for this line
      // Write authorName to the sidediv..
      // get previous authorContainer text
      var prevAuthorName = authors[prev]; // get the previous author class
      var authorId = authorIdFromClass(authorClass); // Get the authorId
      if(!authorId){ return; } // Default text isn't shown
      var authorNameAndColor = authorNameAndColorFromAuthorId(authorId); // Get the authorName And Color
      $authorContainer.css({"border-right":"solid 5px "+authorNameAndColor.color, "padding-right":"5px"});
      if(authorClass !== prevAuthorName){ // if its a new author name and not the same one as the line above.
        $('iframe[name="ace_outer"]').contents().find('#sidedivinner').find('div:nth-child('+nth+')').html(authorNameAndColor.name); // write the author name
      }
      else{
        $authorContainer.html(""); // else leave it blank
      }
      $('iframe[name="ace_outer"]').contents().find('#sidedivinner').find('div:nth-child('+nth+')').attr("title", "Line number "+nth); // add a hover for line numbers
    }
    lineNumber++; // seems weird to do this here but actually makes sense

  }); // end each line
}

function fadeColor(colorCSS, fadeFrac){
  var color;
  color = colorutils.css2triple(colorCSS);
  color = colorutils.blend(color, [1, 1, 1], fadeFrac);
  return colorutils.triple2css(color);
}
out$.aceSetAuthorStyle = aceSetAuthorStyle;

function aceSetAuthorStyle(name, context){
  var dynamicCSS, parentDynamicCSS, info, author, authorSelector, color, authorStyle, parentAuthorStyle, anchorStyle;
  dynamicCSS = context.dynamicCSS, parentDynamicCSS = context.parentDynamicCSS, info = context.info, author = context.author, authorSelector = context.authorSelector;
  if (info) {
    if (!(color = info.bgcolor)) {
      return 1;
    }
    authorStyle = dynamicCSS.selectorStyle(authorSelector);
    parentAuthorStyle = parentDynamicCSS.selectorStyle(authorSelector);
    anchorStyle = dynamicCSS.selectorStyle(authorSelector + ' > a');
    authorStyle.borderBottom = '2px solid ' + color;
    parentAuthorStyle.borderBottom = '2px solid ' + color;
  } else {
    dynamicCSS.removeSelectorStyle(authorSelector);
    parentDynamicCSS.removeSelectorStyle(authorSelector);
  }
  return 1;
}

function authorIdFromClass(className){
  if (className.substring(0, 7) == "author-") {
    className = className.substring(0,49);
    return className.substring(7).replace(/[a-y0-9]+|-|z.+?z/g, function(cc) {
      if (cc == '-') { return '.'; }
      else if (cc.charAt(0) == 'z') {
        return String.fromCharCode(Number(cc.slice(1, -1)));
      }
      else {
        return cc;
      }
    });
  }
}

function authorNameAndColorFromAuthorId(authorId){
    // It could always be me..
    var myAuthorId = pad.myUserInfo.userId;
    if(myAuthorId == authorId){
      return {
        name: "Me",
        color: pad.myUserInfo.colorId
      }
    }

    // Not me, let's look up in the DOM
    var authorObj = {};
    $('#otheruserstable > tbody > tr').each(function(){
      if (authorId == $(this).data("authorid")){
        $(this).find('.usertdname').each( function() {
          authorObj.name = $(this).text();
          if(authorObj.name == "") authorObj.name = "Unknown Author";
        });
        $(this).find('.usertdswatch > div').each( function() {
          authorObj.color = $(this).css("background-color");
        });
        return authorObj;
      }
    });

    // Else go historical
    if(!authorObj || !authorObj.name){
      var authorObj = clientVars.collab_client_vars.historicalAuthorData[authorId]; // Try to use historical data
    }

    return authorObj || {name: "Unknown Author", color: "#fff"};
}

// For those who need them (< IE 9), add support for CSS functions
var isStyleFuncSupported = CSSStyleDeclaration.prototype.getPropertyValue != null;
if (!isStyleFuncSupported) {
    CSSStyleDeclaration.prototype.getPropertyValue = function(a) {
        return this.getAttribute(a);
    };
    CSSStyleDeclaration.prototype.setProperty = function(styleName, value, priority) {
        this.setAttribute(styleName,value);
        var priority = typeof priority != 'undefined' ? priority : '';
        if (priority != '') {
            // Add priority manually
            var rule = new RegExp(RegExp.escape(styleName) + '\\s*:\\s*' + RegExp.escape(value) + '(\\s*;)?', 'gmi');
            this.cssText = this.cssText.replace(rule, styleName + ': ' + value + ' !' + priority + ';');
        } 
    }
    CSSStyleDeclaration.prototype.removeProperty = function(a) {
        return this.removeAttribute(a);
    }
    CSSStyleDeclaration.prototype.getPropertyPriority = function(styleName) {
        var rule = new RegExp(RegExp.escape(styleName) + '\\s*:\\s*[^\\s]*\\s*!important(\\s*;)?', 'gmi');
        return rule.test(this.cssText) ? 'important' : '';
    }
}

// Escape regex chars with \
RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// The style function
jQuery.fn.style = function(styleName, value, priority) {
    // DOM node
    var node = this.get(0);
    // Ensure we have a DOM node 
    if (typeof node == 'undefined') {
        return;
    }
    // CSSStyleDeclaration
    var style = this.get(0).style;
    // Getter/Setter
    if (typeof styleName != 'undefined') {
        if (typeof value != 'undefined') {
            // Set style property
            var priority = typeof priority != 'undefined' ? priority : '';
            style.setProperty(styleName, value, priority);
        } else {
            // Get style property
            return style.getPropertyValue(styleName);
        }
    } else {
        // Get CSSStyleDeclaration
        return style;
    }
}
