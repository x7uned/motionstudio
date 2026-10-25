import Foundation
import Vision

// Face rectangles of one image (macOS Vision, on device). Prints JSON [{x,y,width,height,confidence}] with a top-left origin,
// normalised to the image. Used to crop person-tile portraits around the face (src/lib/media-assets.ts).
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let request = VNDetectFaceRectanglesRequest()
try handler.perform([request])
let faces = (request.results ?? []).map { f -> [String: Double] in
  let b = f.boundingBox
  return ["x": Double(b.minX), "y": Double(1 - b.maxY), "width": Double(b.width), "height": Double(b.height), "confidence": Double(f.confidence)]
}
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: faces))
