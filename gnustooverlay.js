// Functions to launch Gnusto from the Tools menu

function toGnusto()
{
    NewGnustoWindow();
}

function NewGnustoWindow()
{
    // Open Gnusto window
    window.openDialog("chrome://gnusto/content", "_blank", "chrome,all,dialog=no");
}