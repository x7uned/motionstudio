import Foundation
import Vision
import AppKit

struct Frame: Decodable { let file: String; let at: Double }
let input = CommandLine.arguments[1], output = CommandLine.arguments[2]
let frames = try JSONDecoder().decode([Frame].self, from: Data(contentsOf: URL(fileURLWithPath: input)))
var results: [[String: Any]] = []
for frame in frames {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["ru-RU", "en-US"]
  request.usesLanguageCorrection = false
  let handler = VNImageRequestHandler(url: URL(fileURLWithPath: frame.file))
  try handler.perform([request])
  for observation in request.results ?? [] {
    guard let text = observation.topCandidates(1).first else { continue }
    let b = observation.boundingBox
    results.append(["at": frame.at, "text": text.string, "confidence": text.confidence,
      "x": b.minX, "y": 1-b.maxY, "width": b.width, "height": b.height])
  }
}
try JSONSerialization.data(withJSONObject: results).write(to: URL(fileURLWithPath: output), options: .atomic)
