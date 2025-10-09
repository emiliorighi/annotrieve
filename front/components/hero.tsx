"use client"

import CardSwap, { Card } from "./card-swap"
import { Database, Download, Eye, BarChart3, Zap } from "lucide-react"

export function Hero() {
    return (
        <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-[#100818]">
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-[50%_50%] gap-12 items-center">
                    {/* left side - Content */}
                    <div className="space-y-8 flex flex-col justify-center">
                        <div>
                            <h1 className="text-6xl font-semibold text-white mb-6 leading-tight">
                                Genome annotations in one place
                            </h1>
                            <p className="text-2xl text-gray-300 leading-relaxed">
                                Stream GFF files, download annotation packages, and explore eukaryotic genomes from NCBI and Ensembl
                            </p>
                        </div>
                    </div>
                    
                    {/* right side - CardSwap */}
                    <div className="relative h-[500px] hidden lg:flex lg:items-center lg:justify-center">
                        <CardSwap
                            width={400}
                            height={300}
                            cardDistance={40}
                            verticalDistance={50}
                            delay={3000}
                            pauseOnHover={false}
                            easing="linear"
                        >
                            {/* Card 1: Stream */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Stream</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Real-time GFF file streaming by genomic region
                                    </p>
                                </div>
                            </Card>

                            {/* Card 2: Download */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Download className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Download</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Tar packages with custom annotation subsets
                                    </p>
                                </div>
                            </Card>

                            {/* Card 3: Explore */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Eye className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Explore</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Browse genomes with advanced taxonomy filters
                                    </p>
                                </div>
                            </Card>

                            {/* Card 5: Analyze */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm relative overflow-hidden">
                                <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <BarChart3 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Analyze</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Discover insights like genes per mammalia
                                    </p>
                                </div>
                            </Card>

                            {/* Card 6: Database */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Database className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Databases</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Unified access to NCBI and Ensembl
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

