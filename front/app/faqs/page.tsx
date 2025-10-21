"use client"

import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { DataPipelineTimeline } from "@/components/pipeline-steps"
import { StatsComputationGuide } from "@/components/stats-computation-guide"

export default function FAQsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Learn how Annotrieve works and how to use the platform effectively
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="multiple" className="w-full space-y-4">
          {/* How It Works Section */}
          <AccordionItem value="pipeline" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How does the data integration pipeline work?
            </AccordionTrigger>
            <AccordionContent>
              <DataPipelineTimeline />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="stats" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How are statistics computed?
            </AccordionTrigger>
            <AccordionContent>
              <StatsComputationGuide />
            </AccordionContent>
          </AccordionItem>

          {/* General FAQs */}
          <AccordionItem value="what-is" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              What is Annotrieve?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Annotrieve is a unified platform for accessing and analyzing eukaryotic genome annotations from multiple sources including NCBI RefSeq, GenBank, and Ensembl.
              </p>
              <p>
                We process, index, and serve GFF3 annotation files in a standardized format, making it easy to discover, filter, download, and visualize genome annotations across thousands of species.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-sources" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              What data sources does Annotrieve use?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Annotrieve integrates annotations from three major sources:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>NCBI RefSeq</strong> - Curated reference sequences</li>
                <li><strong>NCBI GenBank</strong> - Community-submitted sequences</li>
                <li><strong>Ensembl</strong> - Automated genome annotation database</li>
              </ul>
              <p>
                All annotations are automatically synchronized and updated from these sources.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how-to-download" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How do I download annotations?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <ol className="list-decimal pl-6 space-y-2">
                <li>Browse or search for annotations using the search bar or filters</li>
                <li>Click on the 3 dots icon on the top right of the annotation card to open the dropdown menu</li>
                <li>Click on the "Download" button to download the annotation</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="file-format" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              What file formats are available?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                All annotations are provided in <strong>GFF3 format</strong> (Generic Feature Format version 3), which is the standard format for genomic annotations.
              </p>
              <p>
                Files are compressed using <strong>bgzip</strong> (block gzip) and indexed with <strong>tabix</strong> for efficient random access to specific genomic regions.
              </p>
              <p>
                <strong>File types:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><code className="text-sm bg-muted px-2 py-0.5 rounded">.gff3.gz</code> - Bgzipped GFF3 annotation file</li>
                <li><code className="text-sm bg-muted px-2 py-0.5 rounded">.gff3.gz.csi</code> - Tabix CSI index for fast queries</li>
                <li><code className="text-sm bg-muted px-2 py-0.5 rounded">metadata.json</code> - Annotation metadata (included in downloads)</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="api-access" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              Can I access data programmatically?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Yes! Annotrieve provides a comprehensive REST API for programmatic access.
              </p>
              <p>
                <strong>Key features:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Query and filter annotations by taxonomy, assembly, biotype, feature type, and more</li>
                <li>Stream GFF data for specific genomic regions</li>
                <li>Get frequency counts and statistics</li>
                <li>Download bulk annotation sets</li>
              </ul>
              <p>
                View the interactive <Link href="/api-docs" className="text-primary hover:underline">API Documentation</Link> to explore all available endpoints.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="jbrowse" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How does JBrowse integration work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Annotrieve integrates with JBrowse2, a modern genome browser, to provide interactive visualization of annotations.
              </p>
              <p>
                <strong>Features:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>View annotations in their genomic context</li>
                <li>Navigate chromosomes and regions</li>
                <li>Filter features by type, source, or biotype</li>
                <li>Compare multiple annotation tracks</li>
              </ul>
              <p>
                Click the "View in JBrowse" button on any annotation card to open the genome browser.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="filtering" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              What filters are available?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Annotrieve offers comprehensive filtering options:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Taxonomy</strong> - Filter by species, taxonomy ID, or taxonomic lineage</li>
                <li><strong>Assembly</strong> - Filter by assembly accession or name</li>
                <li><strong>Source</strong> - RefSeq, GenBank, or Ensembl</li>
                <li><strong>Biotypes</strong> - protein_coding, lncRNA, miRNA, etc.</li>
                <li><strong>Feature Types</strong> - gene, mRNA, exon, CDS, etc.</li>
                <li><strong>Pipelines</strong> - BestRefSeq, Gnomon, etc.</li>
                <li><strong>Providers</strong> - Annotation providers and databases</li>
                <li><strong>Release Date</strong> - Filter by publication date range</li>
                <li><strong>Most Recent</strong> - Get only the latest annotation per species</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="updates" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How often is data updated?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                Annotrieve automatically synchronizes with upstream sources to provide the latest annotations.
              </p>
              <p>
                <strong>Update schedule:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>New annotations are checked and imported regularly</li>
                <li>Existing annotations are re-processed when source files are updated</li>
                <li>Statistics are recomputed after each import</li>
              </ul>
              <p>
                Each annotation includes its release date and last modified timestamp for full transparency.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contact" className="border rounded-lg px-6">
            <AccordionTrigger className="text-xl font-semibold hover:no-underline">
              How can I get support or report issues?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4">
              <p>
                We're here to help! You can:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>GitHub Issues:</strong> Report bugs or request features on our{' '}
                  <a 
                    href="https://github.com/emiliorighi/annotrieve/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub repository
                  </a>
                </li>
                <li>
                  <strong>Email:</strong> Contact us at{' '}
                  <a href="mailto:emilio.righi@crg.eu" className="text-primary hover:underline">
                    emilio.righi@crg.eu
                  </a>
                </li>
                <li>
                  <strong>API Issues:</strong> Check the{' '}
                  <Link href="/api-docs" className="text-primary hover:underline">
                    API Documentation
                  </Link>{' '}
                  for endpoint details
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}