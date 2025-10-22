"use client"

import CardSwap, { Card } from "./card-swap"
import { Database, Download, Zap, Globe, TextSearch, ChartBar, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function Hero() {
    const router = useRouter()

    const handleExploreAnnotations = () => {
        router.push('/annotations')
    }

    return (
        <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-primary/10">
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-[50%_50%] gap-12 items-center">
                    {/* left side - Content */}
                    <div className="space-y-8 flex flex-col justify-center">
                        <div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight">
                            <span className="text-accent">Annotrieve</span> <br/>  Eukaryotic Genome Annotations in One Place                            </h1>
                            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 leading-relaxed mb-8">
                            A unified interface for accessing GFF annotations from Ensembl and NCBI across all eukaryotic species. 
                            </p>
                            <Button 
                                onClick={handleExploreAnnotations}
                                size="lg"
                                className="bg-accent hover:bg-accent/90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold gap-2 sm:gap-3 w-full sm:w-auto"
                            >
                                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Explore All Annotations</span>
                                <span className="sm:hidden">Explore Annotations</span>
                                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* right side - CardSwap */}
                    <div className="relative h-[500px] hidden lg:flex lg:items-end lg:justify-start">
                        <CardSwap
                            width={1000}
                            height={750}
                            cardDistance={30}
                            verticalDistance={40}
                            delay={5000}
                            pauseOnHover={false}
                            easing="linear"
                            skewAmount={0}
                        >
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Database className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Unified Access</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        NCBI RefSeq, GenBank, and Ensembl annotations in one place
                                    </p>
                                </div>
                            </Card>
                            {/* <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Stream Features</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Query genes, transcripts, and features dynamically via API
                                    </p>
                                </div>
                            </Card> */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Download className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Download</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Download bgzipped annotations in GFF format                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Globe className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Explore</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Explore thousands of eukaryotic genomes, species, and their annotations
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <TextSearch className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">JBrowse2 Integration</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Visualize annotations directly in the genome browser
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <ChartBar className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Statistics Dashboard</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Gene counts, biotypes, and feature statistics
                                    </p>
                                </div>
                            </Card>
                        </CardSwap>
                    </div>
                </div>
            </div>
        </div>
    )
}

