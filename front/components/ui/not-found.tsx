import { Card } from "./card"
import { Button } from "./button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
export function NotFound({ title, message, buttonText, buttonLink }: { title: string, message: string, buttonText: string, buttonLink: string }) {
    const router = useRouter()
    return (
        <div className="container mx-auto px-4 py-6">
        <Card className="p-12 border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <h4 className="text-lg font-semibold text-foreground mb-2">{title}</h4>
            <p className="text-sm mb-4">{message}</p>
            <Button variant="outline" onClick={() => router.push(buttonLink)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {buttonText}
            </Button>
          </div>
        </Card>
      </div>
    )
}