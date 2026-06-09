package common

import (
	"database/sql"
	"math"
	"os"
	"strconv"
	"time"

	"github.com/zhengkyl/wordmongering/backend/cmd/dash/keymap"
)

const (
	MaxWords = 15
	PageSize = 10
)

var Epoch = parseEpoch()

func parseEpoch() time.Time {
	t, err := time.Parse("2006-01-02", os.Getenv("WM_EPOCH"))
	if err != nil {
		panic(err)
	}
	return t.AddDate(0, 0, -1)
}

func DayToDate(day int) time.Time {
	return Epoch.AddDate(0, 0, day)
}

func MaxDay() int {
	return int(math.Ceil(time.Since(Epoch.AddDate(0, 0, 1).Add(-14 * time.Hour)).Hours() / 24.0))
}

func DayLabel(day int) string {
	d := DayToDate(day)
	return d.Format("Mon, Jan 02") + DimStyle.Render(" · "+strconv.Itoa(day))
}

type Global struct {
	DB      *sql.DB
	KeyMap  keymap.KeyMap
	Words   []string
	WordSet map[string]struct{}
}


type Props struct {
	Width  int
	Height int
	Global Global
}
