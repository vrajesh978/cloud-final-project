var apigClient = apigClientFactory.newClient();


function uploadImage(params, body, additionalParams) {
    console.log("body: ", body)
    return apigClient.gethashtagsPost(params, body, additionalParams)
}
function getCaptions(tag) {
    captionPredictor.empty()
    console.log("tag: ", tag)
    apigClient.getcaptionsPost({}, {tag: tag.slice(1)}, {}).then(function (result) {
        console.log('captions OK', result);
        if(result.data.statusCode != 200){
            alert("Error occured while fetching hashtags, see console for details....")
        } else {
            showCaptions(result.data.body)
        }
    }).catch(function (result) {
        alert("Failed to fetch tags, see console for error....")
        console.log(result);
        error()
    });
    // captions = ["dseiwelnf lfna isefinfeiwefi fineoafieaoij ea oweij."+tag, "dseiwelnf lfna isefinfeiwefi fineoafieaoij ea oweij."+tag]
}

const inputElement = document.querySelector('#image-upload');
const tagInput = $('#tags-input')
const captionInput = $('#caption-input')
const captionPredictor = $('#caption-predictor')
const tagPredictor = $('#tag-predictor')
const share = $('#share')


function setTag(tag) {
    console.log("tag: ", tag)
    var curr = tagInput.val()
    tagInput.val(tag);
    getCaptions(tag);
}
function setCaption(caption){
    captionInput.val(caption);
}
$(".caption").on('hover', function(){
    $(this).toggleClass("selected");
});
$(".caption").on('click', function(){
    caption = $(this).text();
    setCaption(caption)
});

// $(".tag-btn").on('click', function() {
//     var tag = $(this).text(); // $(this) refers to button that was clicked
//     setTag(tag);
// });
function onTagSelect(element) {
    captionPredictor.empty();
    var tag = $(element).text(); // $(this) refers to button that was clicked
    setTag(tag);
}
function onCaptionSelect(element) {
    var caption = $(element).text(); // $(this) refers to button that was clicked
    setCaption(caption)
}
function onShare(element) {
    var tag = tagInput.val();
    var caption = captionInput.val();
    var output = $("#output");
      output.val(tag + "  -  " + caption)
      output.select();
      document.execCommand("copy");
    /* Get the text field */
    
    /* Alert the copied text */
    alert("Copied the text: " + output.val());
    // $(".popup").style.display = "block"
}
function onClose() {
    // $(".popup").style.display = "none"
}
function resetAll() {
    tagInput.val("");
    captionInput.val("");
    captionPredictor.empty();
    tagPredictor.empty();
}

function showTags(tags) {
    console.log("tags: ", tags)
    tags.forEach(tag => {
        tagPredictor.append(`<button type="button" class="btn btn-secondary btn-sm tag-btn" onclick="onTagSelect(this)">${tag}</button>`)
    })
    if(tags.length > 0)
        getCaptions(tags[0])
}
function showCaptions(captions) {
    console.log("captions: ", captions)
    captions.forEach(caption => {
        captionPredictor.append(`<li class="caption" onclick="onCaptionSelect(this)">${caption}</li>`)
    })
}
FilePond.registerPlugin(
    // encodes the file as base64 data
    FilePondPluginFileEncode,

    // validates the size of the file
    FilePondPluginFileValidateSize,

    // corrects mobile image orientation
    FilePondPluginImageExifOrientation,

    // previews dropped images
    FilePondPluginImagePreview
);
function encodeAndUpload(file) {

}
function fileUpload(fieldName, file, metadata, load, error, progress, abort) {
    resetAll();
    console.log(fieldName);
    console.log("file: ", file)
    console.log(file.name);
    const f = file
    let reader = new FileReader();
    let name = f.name;
    let fileType = f.type;
    let fileExt = name.split(".").pop();
    reader.onload = function (e) {
        encoded = btoa(reader.result);
        // console.log("encoded: ", encoded)
        let body = {"image": encoded, 
            "type": fileType,
            "extension": fileExt,
            "name": name,   
            "userName": "testUser"
        }
        let additionalParams = {
            headers: {
                "Content-Type" : fileType+";base64"
            }
        }
        uploadImage({}, body, additionalParams)
        .then(function (result) {
            console.log('tags OK', result);
            if(result.data.statusCode != 200){
                alert("Error occured while fetching hashtags, see console for details....")
            } else {
                showTags(JSON.parse(result.data.body))
            }
            // alert("Photo uploaded successfully!");
            load()
        }).catch(function (result) {
            alert("Failed to fetch tags, see console for error....")
            console.log(result);
            error()
        });
    }
    if (f) {
        reader.readAsBinaryString(f);
    }
    // load()
}
function resetImage(){
    pond.removeFiles()
    resetAll();
}
FilePond.setOptions ({
    server: {
        process: fileUpload,
        load: './load/',
        revert: resetImage,
        restore: resetImage
    }
});
// Select the file input and use create() to turn it into a pond
const pond = FilePond.create(inputElement, {
    maxFiles: 1,
    allowBrowse: true,
    instantUpload: false,
    allowMultiple: false
});
pond.imagePreviewHeight = 300
pond.labelFileProcessing = "Fetching Tags"
pond.labelFileProcessingComplete = "#tags loaded"
pond.labelFileProcessingAborted = "cancelled"
pond.labelFileProcessingError = "error"
pond.on('addfile', (error, data) => {
    if (error) {
        console.log('Error adding file...');
        return;
    }
    console.log('File added:', data.file);
    
});

resetAll()