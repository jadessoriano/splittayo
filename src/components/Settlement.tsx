"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import { Trip, SettledPayment, getPayers } from "@/lib/types";
import { minimizeTransactions, calculateBalances } from "@/lib/settle";
import { CATEGORIES, getCategoryEmoji } from "@/data/categories";
import { exportExpensesCsv, exportSettlementCsv, downloadCsv } from "@/lib/exportCsv";
import QRCode from "qrcode";
import html2canvas from "html2canvas";

interface Props {
  trip: Trip;
  tripId: string;
  settledPayments?: SettledPayment[];
  onMarkSettled?: (from: string, to: string, amount: number) => void;
  onUnmarkSettled?: (id: string) => void;
}

export default function Settlement({ trip, tripId, settledPayments = [], onMarkSettled, onUnmarkSettled }: Props) {
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmUnsettle, setConfirmUnsettle] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const settlements = minimizeTransactions(trip.people, trip.expenses);
  const balances = calculateBalances(trip.people, trip.expenses);

  const isSettled = (from: string, to: string, amount: number) =>
    settledPayments.some(
      (sp) => sp.from === from && sp.to === to && Math.abs(sp.amount - amount) < 0.01
    );

  const getSettledId = (from: string, to: string, amount: number) =>
    settledPayments.find(
      (sp) => sp.from === from && sp.to === to && Math.abs(sp.amount - amount) < 0.01
    )?.id;

  const allSettled = settlements.length > 0 && settlements.every((s) => isSettled(s.from, s.to, s.amount));

  const handleExportCsv = () => {
    const expCsv = exportExpensesCsv(trip, trip.people);
    downloadCsv(expCsv, `${trip.name || "trip"}-expenses.csv`);
  };

  const handleExportSettlementCsv = () => {
    const csv = exportSettlementCsv(settlements, balances, trip.people);
    downloadCsv(csv, `${trip.name || "trip"}-settlement.csv`);
  };

  const formatAmount = (n: number) =>
    Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/trip/${tripId}`
      : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${trip.name || "Trip"} — SplitTayo`,
          text: `Check out our expense breakdown for ${trip.name || "our trip"}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled the share dialog
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShowQR = useCallback(async () => {
    if (showQR) {
      setShowQR(false);
      return;
    }
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#8e3de9", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
    setShowQR(true);
  }, [showQR, shareUrl]);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = () => {
    // Show report first if hidden, then capture on next render
    if (!showReport) {
      setShowReport(true);
      setDownloading(true);
    } else {
      captureReport();
    }
  };

  // Capture after report becomes visible and painted
  useEffect(() => {
    if (downloading && showReport && reportRef.current) {
      // Wait for browser to paint the report before capturing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          captureReport();
          setDownloading(false);
        });
      });
    }
  }, [downloading, showReport]);

  const captureReport = async () => {
    if (!reportRef.current) return;
    const source = reportRef.current;

    // Collect computed styles from the real DOM before html2canvas clones
    const sourceEls = [source, ...Array.from(source.querySelectorAll("*"))];
    const computedStyles = sourceEls.map((el) => {
      const s = window.getComputedStyle(el);
      const styles: Record<string, string> = {};
      for (let i = 0; i < s.length; i++) {
        styles[s[i]] = s.getPropertyValue(s[i]);
      }
      return styles;
    });

    const canvas = await html2canvas(source, {
      backgroundColor: "#ffffff",
      scale: 2,
      scrollY: -window.scrollY,
      windowHeight: source.scrollHeight + 200,
      onclone: (_doc: Document, el: HTMLElement) => {
        // Remove all stylesheets so html2canvas never parses lab() colors
        const sheets = _doc.querySelectorAll('style, link[rel="stylesheet"]');
        sheets.forEach((s) => s.remove());

        // Apply pre-collected computed styles as inline styles
        const clonedEls = [el, ...Array.from(el.querySelectorAll("*"))] as HTMLElement[];
        for (let i = 0; i < clonedEls.length; i++) {
          const saved = computedStyles[i];
          if (!saved) continue;
          for (const [prop, val] of Object.entries(saved)) {
            clonedEls[i].style.setProperty(prop, val);
          }
        }
      },
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${trip.name || "trip"}-breakdown.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const getName = (id: string) =>
    trip.people.find((p) => p.id === id)?.name || "Unknown";

  const total = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card shadow="sm">
      <CardBody className="gap-3">
        <h2 className="font-semibold text-default-800">Settle Up</h2>

        {settlements.length === 0 ? (
          <p className="text-default-400 text-sm">Everyone is even!</p>
        ) : allSettled ? (
          <div className="text-center p-4 bg-success-50 rounded-xl">
            <p className="text-success-600 font-semibold text-lg">All settled!</p>
            <p className="text-success-500 text-sm mt-1">Everyone has been paid.</p>
          </div>
        ) : null}

        {settlements.length > 0 && (
          <div className="space-y-2">
            {settlements.map((s, i) => {
              const settled = isSettled(s.from, s.to, s.amount);
              const settledId = getSettledId(s.from, s.to, s.amount);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl ${settled ? "bg-success-50" : "bg-warning-50"}`}
                >
                  <span className={`text-sm ${settled ? "line-through text-default-400" : "text-default-800"}`}>
                    <span className="font-semibold">{s.from}</span>
                    <span className="mx-1.5 text-default-400">&rarr;</span>
                    <span className="font-semibold">{s.to}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${settled ? "text-success-600 line-through" : "text-warning-600"}`}>
                      &#8369;{formatAmount(s.amount)}
                    </span>
                    {onMarkSettled && onUnmarkSettled && (
                      settled ? (
                        confirmUnsettle === settledId ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (settledId) onUnmarkSettled(settledId);
                                setConfirmUnsettle(null);
                              }}
                              className="text-xs text-danger-500 font-medium"
                            >
                              Undo?
                            </button>
                            <button
                              onClick={() => setConfirmUnsettle(null)}
                              className="text-xs text-default-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmUnsettle(settledId || null)}
                            className="text-success-500 text-lg"
                            title="Mark as unsettled"
                          >
                            &#10003;
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => onMarkSettled(s.from, s.to, s.amount)}
                          className="text-default-300 hover:text-success-500 transition text-lg"
                          title="Mark as settled"
                        >
                          &#9675;
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Divider />

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            color="primary"
            variant="solid"
            onPress={handleNativeShare}
            size="sm"
            className="font-medium text-white"
          >
            Share
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            onPress={handleCopyLink}
            size="sm"
            className="font-medium"
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="flat" onPress={handleShowQR} size="sm">
            {showQR ? "Hide QR" : "QR Code"}
          </Button>
          <Button variant="flat" onPress={handleDownloadReport} size="sm">
            Download
          </Button>
          <Button variant="flat" onPress={handleExportCsv} size="sm">
            CSV
          </Button>
          <Button variant="flat" onPress={handleExportSettlementCsv} size="sm">
            CSV Summary
          </Button>
        </div>

        {/* QR Code */}
        {showQR && qrDataUrl && (
          <div className="flex flex-col items-center p-4 bg-default-50 rounded-xl">
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            <p className="text-xs text-default-500 mt-2">
              Scan to open this trip
            </p>
          </div>
        )}

        {/* View Report toggle */}
        <Button
          variant="light"
          color="secondary"
          onPress={() => setShowReport(!showReport)}
          fullWidth
          size="sm"
        >
          {showReport ? "Hide Report" : "View Full Report"}
        </Button>

        {/* Breakdown Report */}
        {showReport && (
          <div
            ref={reportRef}
            className="p-5 bg-white rounded-xl text-sm border border-default-200"
          >
            <h3 className="font-bold text-center text-lg mb-0.5 text-default-900">
              {trip.name || "Trip"} Breakdown
            </h3>
            <p className="text-center text-default-400 text-xs mb-4">
              Generated by SplitTayo
            </p>

            <div className="mb-4">
              <h4 className="font-semibold text-default-700 mb-1 text-xs uppercase tracking-wide">
                People
              </h4>
              <p className="text-default-600">
                {trip.people.map((p) => p.name).join(", ")}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-default-700 mb-1 text-xs uppercase tracking-wide">
                Expenses
              </h4>
              {trip.expenses.map((e, i) => {
                const payers = getPayers(e);
                const payerNames = payers.map((p) => getName(p.id)).join(", ");
                const emoji = getCategoryEmoji(e.category);
                return (
                  <div
                    key={i}
                    className="flex justify-between text-default-600 py-0.5"
                  >
                    <span className="mr-2 break-words min-w-0">
                      {emoji}{emoji ? " " : ""}{e.description} ({payerNames})
                    </span>
                    <span className="shrink-0">
                      &#8369;{formatAmount(e.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between font-semibold text-default-800 pt-1.5 border-t border-default-200 mt-1.5">
                <span>Total</span>
                <span>&#8369;{formatAmount(total)}</span>
              </div>
            </div>

            {/* Category subtotals */}
            {trip.expenses.some((e) => e.category) && (
              <div className="mb-4">
                <h4 className="font-semibold text-default-700 mb-1 text-xs uppercase tracking-wide">
                  By Category
                </h4>
                {CATEGORIES.filter((cat) =>
                  trip.expenses.some((e) => e.category === cat.id)
                ).map((cat) => {
                  const catTotal = trip.expenses
                    .filter((e) => e.category === cat.id)
                    .reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <div
                      key={cat.id}
                      className="flex justify-between text-default-600 py-0.5"
                    >
                      <span>{cat.emoji} {cat.label}</span>
                      <span>&#8369;{formatAmount(catTotal)}</span>
                    </div>
                  );
                })}
                {trip.expenses.some((e) => !e.category) && (
                  <div className="flex justify-between text-default-600 py-0.5">
                    <span>Uncategorized</span>
                    <span>
                      &#8369;{formatAmount(
                        trip.expenses
                          .filter((e) => !e.category)
                          .reduce((sum, e) => sum + e.amount, 0)
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <h4 className="font-semibold text-default-700 mb-1 text-xs uppercase tracking-wide">
                Balances
              </h4>
              {trip.people.map((p) => {
                const balance = balances[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="flex justify-between text-default-600 py-0.5"
                  >
                    <span>{p.name}</span>
                    <span
                      className={
                        balance >= 0 ? "text-success-600" : "text-danger"
                      }
                    >
                      {balance >= 0 ? "+" : "-"}&#8369;{formatAmount(balance)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div>
              <h4 className="font-semibold text-default-700 mb-1 text-xs uppercase tracking-wide">
                Settlement
              </h4>
              {settlements.length === 0 ? (
                <p className="text-default-400">Everyone is even!</p>
              ) : (
                settlements.map((s, i) => (
                  <div key={i} className="text-default-600 py-0.5">
                    {s.from} pays {s.to}: &#8369;{formatAmount(s.amount)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
