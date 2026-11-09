import AppKit
func load(_ path:String) -> NSBitmapImageRep {
    guard let image=NSImage(contentsOfFile:path),let data=image.tiffRepresentation,let bitmap=NSBitmapImageRep(data:data) else {print("Cannot load render: \(path)");exit(2)}
    return bitmap
}
let first=load(CommandLine.arguments[1]),second=load(CommandLine.arguments[2])
guard first.pixelsWide==second.pixelsWide && first.pixelsHigh==second.pixelsHigh else {fatalError("Render size changed")}
var changed=0,maximum:Double=0,sum:Double=0
for y in 0..<first.pixelsHigh {for x in 0..<first.pixelsWide {
    let a=first.colorAt(x:x,y:y)!.usingColorSpace(.deviceRGB)!,b=second.colorAt(x:x,y:y)!.usingColorSpace(.deviceRGB)!
    let diffs=[abs(a.redComponent-b.redComponent),abs(a.greenComponent-b.greenComponent),abs(a.blueComponent-b.blueComponent),abs(a.alphaComponent-b.alphaComponent)]
    let difference=Double(diffs.max()!); maximum=max(maximum,difference);sum+=difference
    if difference>2.0/255.0 {changed+=1}
}}
let count=Double(first.pixelsWide*first.pixelsHigh)
print("Appearance comparison: \(changed) pixels differ by >2/255; mean=\(sum/count), max=\(maximum)")
// Small subpixel antialias differences are tolerated, changed effects/opacity are not.
if Double(changed)/count>0.001 || sum/count>0.0002 {exit(1)}
